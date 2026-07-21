#!/usr/bin/env bash
# =============================================================================
# Build and install a full-featured FFmpeg into $HOME/.local on CentOS 7 EOL.
#
# Codecs: x264, x265, fdk-aac, libvpx (VP8/VP9), opus, aom (AV1),
#         SVT-AV1, mp3lame
# TLS:    OpenSSL 1.1.1w (built from source — CentOS 7 ships 1.0.2)
# Toolchain: devtoolset-10 (GCC 10) via SCL — required for C++17 support
#
# All libs are built as SHARED (.so) so PyAV and other Python bindings work.
#
# Usage:
#   chmod +x build_ffmpeg_centos7.sh
#   ./build_ffmpeg_centos7.sh
# =============================================================================

set -euo pipefail

# --------------------------------------------------------------------------- #
# Config
# --------------------------------------------------------------------------- #
PREFIX="$HOME/.local"
SOURCES="$HOME/ffmpeg_sources"
GCC="/opt/rh/devtoolset-10/root/usr/bin/gcc"
GXX="/opt/rh/devtoolset-10/root/usr/bin/g++"
NASM_VERSION="2.16.01"
OPENSSL_VERSION="1.1.1w"
JOBS=$(nproc)

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
info() { echo -e "${GREEN}[INFO]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() {
	echo -e "${RED}[ERROR]${NC} $*"
	exit 1
}
section() {
	echo -e "\n${GREEN}==============================${NC}"
	echo -e "${GREEN} $*${NC}"
	echo -e "${GREEN}==============================${NC}\n"
}

# --------------------------------------------------------------------------- #
# Preflight checks
# --------------------------------------------------------------------------- #
section "Preflight checks"

[[ "$(id -u)" -eq 0 ]] && error "Do not run as root. Run as a regular user with sudo access."

# Check CentOS 7
if ! grep -q "CentOS Linux 7" /etc/os-release 2>/dev/null; then
	warn "This script targets CentOS 7. Proceed with caution on other distros."
fi

# Check devtoolset-10
if [[ ! -x "$GCC" ]]; then
	info "devtoolset-10 not found at $GCC — installing..."
	sudo yum install -y centos-release-scl
	sudo yum install -y devtoolset-10-gcc devtoolset-10-gcc-c++
fi

[[ -x "$GCC" ]] || error "GCC 10 still not found at $GCC. Check SCL installation."
info "GCC 10: $($GCC --version | head -1)"

# --------------------------------------------------------------------------- #
# Fix EOL repos and install system deps
# --------------------------------------------------------------------------- #
section "Fixing CentOS 7 EOL repos"

sudo sed -i 's/mirrorlist/#mirrorlist/g' /etc/yum.repos.d/CentOS-*.repo
sudo sed -i 's|#baseurl=http://mirror.centos.org|baseurl=http://vault.centos.org|g' /etc/yum.repos.d/CentOS-*.repo
sudo yum clean all -q
sudo yum makecache -q

info "Installing EPEL..."
sudo yum install -y epel-release -q
sudo sed -i 's/mirrorlist/#mirrorlist/g' /etc/yum.repos.d/epel*.repo 2>/dev/null || true
sudo sed -i 's|#baseurl=https://download.fedoraproject.org/pub|baseurl=https://archives.fedoraproject.org/pub/archive|g' \
	/etc/yum.repos.d/epel*.repo 2>/dev/null || true

info "Installing build dependencies..."
sudo yum install -y \
	autoconf automake bzip2 bzip2-devel cmake freetype-devel \
	git libtool make pkgconfig zlib-devel openssl-devel \
	yasm gnutls-devel curl -q

# --------------------------------------------------------------------------- #
# Setup
# --------------------------------------------------------------------------- #
section "Setting up build environment"

mkdir -p "$PREFIX/bin" "$PREFIX/lib/pkgconfig" "$SOURCES"

export PATH="$PREFIX/bin:$PATH"
export PKG_CONFIG_PATH="$PREFIX/lib/pkgconfig:$PREFIX/lib64/pkgconfig"
export LD_LIBRARY_PATH="$PREFIX/lib:$PREFIX/lib64${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"

# Persist env to ~/.bashrc if not already there
for line in \
	"export PATH=\"\$HOME/.local/bin:\$PATH\"" \
	"export PKG_CONFIG_PATH=\"\$HOME/.local/lib/pkgconfig:\$HOME/.local/lib64/pkgconfig\"" \
	"export LD_LIBRARY_PATH=\"\$HOME/.local/lib:\$HOME/.local/lib64:\$LD_LIBRARY_PATH\"" \
	"source scl_source enable devtoolset-10"; do
	grep -qF "${line}" ~/.bashrc 2>/dev/null || echo "${line}" >>~/.bashrc
done

# --------------------------------------------------------------------------- #
# Helper: write a .pc file
# --------------------------------------------------------------------------- #
write_pc() {
	local name="$1" desc="$2" version="$3" libs="$4" cflags="$5" requires="${6:-}"
	cat >"$PREFIX/lib/pkgconfig/${name}.pc" <<EOF
prefix=$PREFIX
exec_prefix=\${prefix}
libdir=\${exec_prefix}/lib
includedir=\${prefix}/include

Name: $name
Description: $desc
Version: $version
${requires:+Requires: $requires}
Libs: -L\${libdir} $libs
Cflags: -I\${includedir} $cflags
EOF
	info "Wrote $PREFIX/lib/pkgconfig/${name}.pc"
}

# --------------------------------------------------------------------------- #
# 1. nasm
# --------------------------------------------------------------------------- #
section "1/10  nasm $NASM_VERSION"

if [[ ! -x "$PREFIX/bin/nasm" ]]; then
	cd "$SOURCES"
	[[ -f "nasm-${NASM_VERSION}.tar.bz2" ]] ||
		curl -O "https://www.nasm.us/pub/nasm/releasebuilds/${NASM_VERSION}/nasm-${NASM_VERSION}.tar.bz2"
	tar xjf "nasm-${NASM_VERSION}.tar.bz2"
	cd "nasm-${NASM_VERSION}"
	CC="$GCC" ./configure --prefix="$PREFIX"
	make -j"$JOBS"
	make install
else
	info "nasm already installed: $(nasm -v)"
fi

# --------------------------------------------------------------------------- #
# 2. OpenSSL 1.1.1w (shared)
# --------------------------------------------------------------------------- #
section "2/10  OpenSSL $OPENSSL_VERSION (shared)"

if ! pkg-config --exists openssl 2>/dev/null; then
	cd "$SOURCES"
	[[ -f "openssl-${OPENSSL_VERSION}.tar.gz" ]] ||
		curl -O "https://www.openssl.org/source/openssl-${OPENSSL_VERSION}.tar.gz"
	tar xzf "openssl-${OPENSSL_VERSION}.tar.gz"
	cd "openssl-${OPENSSL_VERSION}"
	CC="$GCC" ./config \
		--prefix="$PREFIX" \
		--openssldir="$PREFIX/ssl" \
		shared no-async
	make -j"$JOBS"
	make install_sw
	# Generate .pc files if missing
	if ! pkg-config --exists openssl 2>/dev/null; then
		write_pc "openssl" "OpenSSL" "1.1.1w" "-lssl -lcrypto" ""
		write_pc "libssl" "OpenSSL-libssl" "1.1.1w" "-lssl" "" "libcrypto"
		write_pc "libcrypto" "OpenSSL-libcrypto" "1.1.1w" "-lcrypto" ""
	fi
else
	info "OpenSSL already installed: $(pkg-config --modversion openssl)"
fi

# --------------------------------------------------------------------------- #
# 3. x264 (shared)
# --------------------------------------------------------------------------- #
section "3/10  x264 (shared)"

if ! pkg-config --exists x264 2>/dev/null; then
	cd "$SOURCES"
	[[ -d "x264" ]] || git clone --depth 1 https://code.videolan.org/videolan/x264.git
	cd x264
	CC="$GCC" ./configure \
		--prefix="$PREFIX" \
		--enable-shared \
		--disable-static \
		--enable-pic
	make -j"$JOBS"
	make install
else
	info "x264 already installed: $(pkg-config --modversion x264)"
fi

# --------------------------------------------------------------------------- #
# 4. x265 (shared) — CMake does not auto-generate x265.pc, write it manually
# --------------------------------------------------------------------------- #
section "4/10  x265 (shared)"

if [[ ! -f "$PREFIX/lib/libx265.so" ]]; then
	cd "$SOURCES"
	[[ -d "x265_git" ]] || git clone --depth 1 https://bitbucket.org/multicoreware/x265_git.git
	cd x265_git/build/linux
	rm -f CMakeCache.txt
	cmake -G "Unix Makefiles" \
		-DCMAKE_INSTALL_PREFIX="$PREFIX" \
		-DENABLE_SHARED=ON \
		-DCMAKE_C_COMPILER="$GCC" \
		-DCMAKE_CXX_COMPILER="$GXX" \
		../../source
	make -j"$JOBS"
	make install || true # CMake may skip .so install — we handle it below

	# Copy .so manually if CMake skipped it (known quirk)
	if [[ ! -f "$PREFIX/lib/libx265.so" ]]; then
		warn "CMake did not install libx265.so — copying manually"
		cp -P libx265.so* "$PREFIX/lib/"
	fi
else
	info "x265 shared lib already present"
fi

# Always (re)write x265.pc — CMake never generates it
X265_VERSION=$(cd "$SOURCES/x265_git" && git describe --tags 2>/dev/null | tr -d 'v' || echo "3.5")
write_pc "x265" "H.265/HEVC video encoder" "${X265_VERSION:-3.5}" "-lx265" ""

# --------------------------------------------------------------------------- #
# 5. fdk-aac (shared)
# --------------------------------------------------------------------------- #
section "5/10  fdk-aac (shared)"

if ! pkg-config --exists fdk-aac 2>/dev/null; then
	cd "$SOURCES"
	[[ -d "fdk-aac" ]] || git clone --depth 1 https://github.com/mstorsjo/fdk-aac.git
	cd fdk-aac
	autoreconf -fiv
	CC="$GCC" CXX="$GXX" ./configure \
		--prefix="$PREFIX" \
		--enable-shared \
		--disable-static
	make -j"$JOBS"
	make install
else
	info "fdk-aac already installed: $(pkg-config --modversion fdk-aac)"
fi

# --------------------------------------------------------------------------- #
# 6. libvpx (shared) — disable AVX-512 (broken with GCC 10 + nasm on CentOS 7)
# --------------------------------------------------------------------------- #
section "6/10  libvpx (shared)"

if ! pkg-config --exists vpx 2>/dev/null; then
	cd "$SOURCES"
	[[ -d "libvpx" ]] || git clone --depth 1 https://chromium.googlesource.com/webm/libvpx.git
	cd libvpx
	CC="$GCC" CXX="$GXX" ./configure \
		--prefix="$PREFIX" \
		--enable-shared \
		--disable-static \
		--disable-examples \
		--disable-unit-tests \
		--enable-vp9-highbitdepth \
		--as=yasm \
		--disable-avx512
	make -j"$JOBS"
	make install
else
	info "libvpx already installed: $(pkg-config --modversion vpx)"
fi

# --------------------------------------------------------------------------- #
# 7. opus (shared)
# --------------------------------------------------------------------------- #
section "7/10  opus (shared)"

if ! pkg-config --exists opus 2>/dev/null; then
	cd "$SOURCES"
	[[ -d "opus" ]] || git clone --depth 1 https://github.com/xiph/opus.git
	cd opus
	./autogen.sh
	CC="$GCC" ./configure \
		--prefix="$PREFIX" \
		--enable-shared \
		--disable-static
	make -j"$JOBS"
	make install
else
	info "opus already installed: $(pkg-config --modversion opus)"
fi

# --------------------------------------------------------------------------- #
# 8. libaom AV1 (shared)
# --------------------------------------------------------------------------- #
section "8/10  libaom (shared)"

if ! pkg-config --exists aom 2>/dev/null; then
	cd "$SOURCES"
	[[ -d "aom" ]] || git clone --depth 1 https://aomedia.googlesource.com/aom
	rm -rf aom_build
	mkdir aom_build && cd aom_build
	cmake -G "Unix Makefiles" \
		-DCMAKE_INSTALL_PREFIX="$PREFIX" \
		-DENABLE_TESTS=OFF \
		-DENABLE_NASM=on \
		-DBUILD_SHARED_LIBS=1 \
		-DCMAKE_C_COMPILER="$GCC" \
		-DCMAKE_CXX_COMPILER="$GXX" \
		../aom
	make -j"$JOBS"
	make install
else
	info "aom already installed: $(pkg-config --modversion aom)"
fi

# --------------------------------------------------------------------------- #
# 9. SVT-AV1 (shared)
# --------------------------------------------------------------------------- #
section "9/10  SVT-AV1 (shared)"

if ! pkg-config --exists SvtAv1Enc 2>/dev/null; then
	cd "$SOURCES"
	[[ -d "SVT-AV1" ]] || git clone https://gitlab.com/AOMediaCodec/SVT-AV1.git
	rm -rf SVT-AV1/build
	mkdir -p SVT-AV1/build && cd SVT-AV1/build
	cmake \
		-DCMAKE_INSTALL_PREFIX="$PREFIX" \
		-DCMAKE_BUILD_TYPE=Release \
		-DBUILD_SHARED_LIBS=ON \
		-DCMAKE_C_COMPILER="$GCC" \
		-DCMAKE_CXX_COMPILER="$GXX" \
		..
	make -j"$JOBS"
	# SVT-AV1 sometimes ignores PREFIX and installs to /usr/local
	if make install 2>&1 | grep -q "Permission denied"; then
		warn "SVT-AV1 tried to install to /usr/local — using sudo then symlinking"
		sudo make install
		mkdir -p "$PREFIX/lib64/pkgconfig"
		find /usr/local/lib64 -iname "libSvtAv1Enc*" -exec ln -sf {} "$PREFIX/lib64/" \;
		[[ -f "/usr/local/lib64/pkgconfig/SvtAv1Enc.pc" ]] &&
			ln -sf /usr/local/lib64/pkgconfig/SvtAv1Enc.pc "$PREFIX/lib64/pkgconfig/"
	fi
else
	info "SVT-AV1 already installed: $(pkg-config --modversion SvtAv1Enc)"
fi

# --------------------------------------------------------------------------- #
# 10. mp3lame (shared) — does not auto-generate .pc, write it manually
# --------------------------------------------------------------------------- #
section "10/10  mp3lame (shared)"

if [[ ! -f "$PREFIX/lib/libmp3lame.so" ]]; then
	cd "$SOURCES"
	[[ -d "lame" ]] || git clone --depth 1 https://github.com/lameproject/lame.git
	cd lame
	CC="$GCC" ./configure \
		--prefix="$PREFIX" \
		--enable-shared \
		--disable-static \
		--disable-frontend
	make -j"$JOBS"
	make install
else
	info "mp3lame shared lib already present"
fi

# lame never generates a .pc file
write_pc "mp3lame" "MPEG Audio Layer 3 encoder" "3.100" "-lmp3lame" ""

# --------------------------------------------------------------------------- #
# Build FFmpeg (shared)
# --------------------------------------------------------------------------- #
section "Building FFmpeg (shared)"

cd "$SOURCES"
[[ -d "ffmpeg" ]] || git clone --depth 1 https://git.ffmpeg.org/ffmpeg.git
cd ffmpeg

# Clean any previous (possibly static) build
make distclean 2>/dev/null || true

export PKG_CONFIG_PATH="$PREFIX/lib/pkgconfig:$PREFIX/lib64/pkgconfig"

CC="$GCC" CXX="$GXX" \
	./configure \
	--prefix="$PREFIX" \
	--extra-cflags="-I$PREFIX/include" \
	--extra-ldflags="-L$PREFIX/lib" \
	--bindir="$PREFIX/bin" \
	--enable-shared \
	--disable-static \
	--enable-gpl \
	--enable-openssl \
	--enable-libaom \
	--enable-libsvtav1 \
	--enable-libfdk-aac \
	--enable-libfreetype \
	--enable-libmp3lame \
	--enable-libopus \
	--enable-libvpx \
	--enable-libx264 \
	--enable-libx265 \
	--enable-nonfree

make -j"$JOBS"
make install
hash -r

# --------------------------------------------------------------------------- #
# Register shared libs with ldconfig (system-wide, requires sudo)
# --------------------------------------------------------------------------- #
section "Registering shared libs"

if sudo -n true 2>/dev/null; then
	echo "$PREFIX/lib" | sudo tee /etc/ld.so.conf.d/local-user.conf >/dev/null
	echo "$PREFIX/lib64" | sudo tee -a /etc/ld.so.conf.d/local-user.conf >/dev/null
	sudo ldconfig
	info "ldconfig updated — LD_LIBRARY_PATH not required in new shells"
else
	warn "No passwordless sudo — skipping ldconfig. LD_LIBRARY_PATH must be set in each shell."
	warn "Add this to ~/.bashrc if not already there:"
	warn "  export LD_LIBRARY_PATH=\"\$HOME/.local/lib:\$HOME/.local/lib64:\$LD_LIBRARY_PATH\""
fi

# --------------------------------------------------------------------------- #
# Verify
# --------------------------------------------------------------------------- #
section "Verification"

export LD_LIBRARY_PATH="$PREFIX/lib:$PREFIX/lib64${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"

info "FFmpeg binary: $(which ffmpeg)"
ffmpeg -version | head -5

info "Encoder check:"
ffmpeg -encoders 2>&1 | grep -E "libaom|libsvt|libx264|libx265|libfdk|libvpx|libopus|libmp3lame" ||
	warn "Some encoders not listed — check configure output above"

info "Shared lib linkage:"
ldd "$(which ffmpeg)" | grep -E "x264|x265|aom|fdk|opus|vpx|mp3lame|ssl" ||
	warn "Codec .so files not showing in ldd — check LD_LIBRARY_PATH"

echo ""
info "Done! FFmpeg installed to $PREFIX/bin/ffmpeg"
info "Source ~/.bashrc or open a new shell to pick up env changes."
info "Then: pip install av"
