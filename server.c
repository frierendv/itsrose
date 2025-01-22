#include <arpa/inet.h>
#include <errno.h>
#include <fcntl.h>
#include <pthread.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>

#define PORT 2806
#define LISTENQ 10
#define PUBLIC_HTML "html"

int list_s;

typedef struct {
    int returncode;
    char *filename;
} httpRequest;

typedef struct {
    pthread_mutex_t mutexlock;
    int totalbytes;
} sharedVariables;

const char *header200 = "HTTP/1.0 200 OK\nServer: ItsRose One\nContent-Type: text/html\n\n";
const char *header400 = "HTTP/1.0 400 Bad Request\nServer: ItsRose One\nContent-Type: text/html\n\n";
const char *header404 = "HTTP/1.0 404 Not Found\nServer: ItsRose One\nContent-Type: text/html\n\n";

char *getMessage(int fd) {
    FILE *sstream = fdopen(fd, "r");
    if (!sstream) {
        perror("Error opening file descriptor in getMessage()");
        exit(EXIT_FAILURE);
    }

    size_t size = 0;
    char *block = NULL;
    char *line = NULL;
    ssize_t len;

    while ((len = getline(&line, &size, sstream)) != -1) {
        if (strcmp(line, "\r\n") == 0) {
            break;
        }
        block = realloc(block, (block ? strlen(block) : 0) + len + 1);
        strcat(block, line);
    }

    free(line);
    return block;
}

int sendMessage(int fd, const char *msg) {
    return write(fd, msg, strlen(msg));
}

char *getFileName(const char *msg) {
    char *file = malloc(strlen(msg));
    if (!file) {
        perror("Error allocating memory to file in getFileName()");
        exit(EXIT_FAILURE);
    }

    sscanf(msg, "GET %s HTTP/1.1", file);

    char *base = malloc(strlen(file) + strlen(PUBLIC_HTML) + 1);
    if (!base) {
        perror("Error allocating memory to base in getFileName()");
        exit(EXIT_FAILURE);
    }

    strcpy(base, PUBLIC_HTML);
    strcat(base, file);

    free(file);
    return base;
}

httpRequest parseRequest(const char *msg) {
    httpRequest ret;
    char *filename = getFileName(msg);

    if (strstr(filename, "..")) {
        ret.returncode = 400;
        ret.filename = "400.html";
    } else if (strcmp(filename, PUBLIC_HTML "/") == 0) {
        ret.returncode = 200;
        ret.filename = PUBLIC_HTML "/index.html";
    } else if (fopen(filename, "r")) {
        ret.returncode = 200;
        ret.filename = filename;
    } else {
        ret.returncode = 404;
        ret.filename = "404.html";
    }

    return ret;
}

int printFile(int fd, const char *filename) {
    FILE *read = fopen(filename, "r");
    if (!read) {
        perror("Error opening file in printFile()");
        exit(EXIT_FAILURE);
    }

    struct stat st;
    stat(filename, &st);
    int totalsize = st.st_size;

    char *line = NULL;
    size_t size = 0;
    ssize_t len;

    while ((len = getline(&line, &size, read)) != -1) {
        sendMessage(fd, line);
    }

    sendMessage(fd, "\n");
    free(line);
    fclose(read);
    return totalsize;
}

void cleanup(int sig) {
    printf("Cleaning up connections and exiting.\n");

    if (close(list_s) < 0) {
        perror("Error calling close()");
        exit(EXIT_FAILURE);
    }

    shm_unlink("/sharedmem");
    exit(EXIT_SUCCESS);
}

int printHeader(int fd, int returncode) {
    const char *header;
    switch (returncode) {
        case 200:
            header = header200;
            break;
        case 400:
            header = header400;
            break;
        case 404:
            header = header404;
            break;
        default:
            return 0;
    }
    sendMessage(fd, header);
    return strlen(header);
}

int recordTotalBytes(int bytes_sent, sharedVariables *mempointer) {
    pthread_mutex_lock(&mempointer->mutexlock);
    mempointer->totalbytes += bytes_sent;
    pthread_mutex_unlock(&mempointer->mutexlock);
    return mempointer->totalbytes;
}

int main(int argc, char *argv[]) {
    int conn_s;
    short int port = PORT;
    struct sockaddr_in servaddr;

    signal(SIGINT, cleanup);

    if ((list_s = socket(AF_INET, SOCK_STREAM, 0)) < 0) {
        perror("Error creating listening socket.");
        exit(EXIT_FAILURE);
    }

    memset(&servaddr, 0, sizeof(servaddr));
    servaddr.sin_family = AF_INET;
    servaddr.sin_addr.s_addr = htonl(INADDR_ANY);
    servaddr.sin_port = htons(port);

    if (bind(list_s, (struct sockaddr *)&servaddr, sizeof(servaddr)) < 0) {
        perror("Error calling bind()");
        exit(EXIT_FAILURE);
    }

    if (listen(list_s, LISTENQ) == -1) {
        perror("Error Listening");
        exit(EXIT_FAILURE);
    }

    shm_unlink("/sharedmem");

    int sharedmem = shm_open("/sharedmem", O_RDWR | O_CREAT | O_EXCL, S_IRUSR | S_IWUSR);
    if (sharedmem == -1) {
        perror("Error opening sharedmem in main()");
        exit(EXIT_FAILURE);
    }

    ftruncate(sharedmem, sizeof(sharedVariables));
    sharedVariables *mempointer = mmap(NULL, sizeof(sharedVariables), PROT_READ | PROT_WRITE, MAP_SHARED, sharedmem, 0);

    if (mempointer == MAP_FAILED) {
        perror("Error setting shared memory for sharedVariables in recordTotalBytes()");
        exit(EXIT_FAILURE);
    }

    pthread_mutex_init(&mempointer->mutexlock, NULL);
    mempointer->totalbytes = 0;

    int addr_size = sizeof(servaddr);
    int headersize, pagesize, totaldata;
    int children = 0;
    pid_t pid;

    while (1) {
        if (children <= 10) {
            pid = fork();
            children++;
        }

        if (pid == -1) {
            perror("can't fork");
            exit(EXIT_FAILURE);
        }

        if (pid == 0) {
            while (1) {
                conn_s = accept(list_s, (struct sockaddr *)&servaddr, &addr_size);

                if (conn_s == -1) {
                    perror("Error accepting connection");
                    exit(EXIT_FAILURE);
                }

                char *header = getMessage(conn_s);
                httpRequest details = parseRequest(header);
                free(header);

                headersize = printHeader(conn_s, details.returncode);
                pagesize = printFile(conn_s, details.filename);
                totaldata = recordTotalBytes(headersize + pagesize, mempointer);

                printf("Process %d served a request of %d bytes. Total bytes sent %d\n", getpid(), headersize + pagesize, totaldata);
                close(conn_s);
            }
        }
    }

    return EXIT_SUCCESS;
}
