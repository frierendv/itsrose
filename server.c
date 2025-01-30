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
#define BUFFER_SIZE 4096

int list_s;

typedef struct {
    int returncode;
    char filename[256];
} httpRequest;

typedef struct {
    pthread_mutex_t mutexlock;
    int totalbytes;
} sharedVariables;

const char *header200 = "HTTP/1.0 200 OK\r\nServer: ItsRose One\r\nContent-Type: text/html\r\n\r\n";
const char *header400 = "HTTP/1.0 400 Bad Request\r\nServer: ItsRose One\r\nContent-Type: text/html\r\n\r\n";
const char *header404 = "HTTP/1.0 404 Not Found\r\nServer: ItsRose One\r\nContent-Type: text/html\r\n\r\n";

int sendMessage(int fd, const char *msg, size_t len) {
    return write(fd, msg, len);
}

httpRequest parseRequest(const char *msg) {
    httpRequest ret;
    sscanf(msg, "GET %255s HTTP/1.1", ret.filename);

    if (strstr(ret.filename, "..")) {
        ret.returncode = 400;
        strcpy(ret.filename, "400.html");
    } else if (strcmp(ret.filename, "/") == 0) {
        ret.returncode = 200;
        strcpy(ret.filename, PUBLIC_HTML "/index.html");
    } else {
        struct stat st;
        char path[512];
        snprintf(path, sizeof(path), "%s%s", PUBLIC_HTML, ret.filename);
        if (stat(path, &st) == 0) {
            ret.returncode = 200;
            strcpy(ret.filename, path);
        } else {
            ret.returncode = 404;
            strcpy(ret.filename, "404.html");
        }
    }

    return ret;
}

int printFile(int fd, const char *filename) {
    int total = 0;
    char buffer[BUFFER_SIZE];
    FILE *read = fopen(filename, "r");
    if (!read) return 0;

    while (fgets(buffer, sizeof(buffer), read)) {
        int len = strlen(buffer);
        write(fd, buffer, len);
        total += len;
    }
    fclose(read);
    return total;
}

void cleanup(int sig) {
    close(list_s);
    shm_unlink("/sharedmem");
    exit(EXIT_SUCCESS);
}

int recordTotalBytes(int bytes_sent, sharedVariables *mempointer) {
    pthread_mutex_lock(&mempointer->mutexlock);
    mempointer->totalbytes += bytes_sent;
    int total = mempointer->totalbytes;
    pthread_mutex_unlock(&mempointer->mutexlock);
    return total;
}

int main(int argc, char *argv[]) {
    int conn_s;
    struct sockaddr_in servaddr;
    signal(SIGINT, cleanup);

    list_s = socket(AF_INET, SOCK_STREAM, 0);
    if (list_s < 0) exit(EXIT_FAILURE);

    memset(&servaddr, 0, sizeof(servaddr));
    servaddr.sin_family = AF_INET;
    servaddr.sin_addr.s_addr = INADDR_ANY;
    servaddr.sin_port = htons(PORT);

    if (bind(list_s, (struct sockaddr *)&servaddr, sizeof(servaddr)) < 0) exit(EXIT_FAILURE);
    if (listen(list_s, LISTENQ) == -1) exit(EXIT_FAILURE);

    shm_unlink("/sharedmem");
    int sharedmem = shm_open("/sharedmem", O_RDWR | O_CREAT | O_EXCL, S_IRUSR | S_IWUSR);
    ftruncate(sharedmem, sizeof(sharedVariables));
    sharedVariables *mempointer = mmap(NULL, sizeof(sharedVariables), PROT_READ | PROT_WRITE, MAP_SHARED, sharedmem, 0);
    pthread_mutex_init(&mempointer->mutexlock, NULL);
    mempointer->totalbytes = 0;

    while ((conn_s = accept(list_s, NULL, NULL)) != -1) {
        httpRequest req;
        char buffer[BUFFER_SIZE];
        int bytes = read(conn_s, buffer, sizeof(buffer) - 1);
        if (bytes > 0) {
            buffer[bytes] = '\0';
            req = parseRequest(buffer);
            const char *header;
            switch (req.returncode) {
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
                    header = header400;
            }
            int headersize = sendMessage(conn_s, header, strlen(header));
            int pagesize = printFile(conn_s, req.filename);
            int total = recordTotalBytes(headersize + pagesize, mempointer);
            close(conn_s);
        }
    }

    return EXIT_SUCCESS;
}
