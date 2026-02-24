include_guard(GLOBAL)

if(WIN32)
  set(lib exif.lib)
else()
  set(lib libexif.a)
endif()

set(env)

set(args
  --disable-shared
  --disable-docs

  --with-pic
)

if(CMAKE_SYSTEM_NAME)
  set(platform ${CMAKE_SYSTEM_NAME})
else()
  set(platform ${CMAKE_HOST_SYSTEM_NAME})
endif()

string(TOLOWER "${platform}" platform)

if(platform MATCHES "darwin|ios")
  set(platform "darwin")
elseif(platform MATCHES "linux|android")
  set(platform "linux")
elseif(platform MATCHES "windows")
  set(platform "windows")
else()
  message(FATAL_ERROR "Unsupported platform '${platform}'")
endif()

if(APPLE AND CMAKE_OSX_ARCHITECTURES)
  set(arch ${CMAKE_OSX_ARCHITECTURES})
elseif(MSVC AND CMAKE_GENERATOR_PLATFORM)
  set(arch ${CMAKE_GENERATOR_PLATFORM})
elseif(ANDROID AND CMAKE_ANDROID_ARCH_ABI)
  set(arch ${CMAKE_ANDROID_ARCH_ABI})
elseif(CMAKE_SYSTEM_PROCESSOR)
  set(arch ${CMAKE_SYSTEM_PROCESSOR})
else()
  set(arch ${CMAKE_HOST_SYSTEM_PROCESSOR})
endif()

string(TOLOWER "${arch}" arch)

if(arch MATCHES "arm64|aarch64")
  set(arch "aarch64")
elseif(arch MATCHES "armv7-a|armeabi-v7a")
  set(arch "arm")
elseif(arch MATCHES "x64|x86_64|amd64")
  set(arch "x86_64")
elseif(arch MATCHES "x86|i386|i486|i586|i686")
  set(arch "i686")
else()
  message(FATAL_ERROR "Unsupported architecture '${arch}'")
endif()

list(APPEND args --host=${arch}-${platform})

if(APPLE)
  list(APPEND args --with-sysroot=${CMAKE_OSX_SYSROOT})
elseif(ANDROID)
  list(APPEND args --with-sysroot=${CMAKE_SYSROOT})
endif()

if(CMAKE_C_COMPILER)
  cmake_path(GET CMAKE_C_COMPILER PARENT_PATH CC_path)
  cmake_path(GET CMAKE_C_COMPILER FILENAME CC_filename)

  list(APPEND env
    "CC=${CC_filename}"
    "CFLAGS=--target=${CMAKE_C_COMPILER_TARGET}"
  )

  if(CMAKE_LINKER_TYPE MATCHES "LLD")
    list(APPEND env "LDFLAGS=--target=${CMAKE_C_COMPILER_TARGET} -fuse-ld=lld")
  else()
    list(APPEND env "LDFLAGS=--target=${CMAKE_C_COMPILER_TARGET}")
  endif()

  list(APPEND env --modify "PATH=path_list_prepend:${CC_path}")
endif()

declare_port(
  "github:libexif/libexif@0.6.25"
  exif
  AUTOTOOLS
  BYPRODUCTS lib/${lib}
  ARGS ${args}
  ENV ${env}
  PATCHES
    patches/01-intptr.patch
)

add_library(exif STATIC IMPORTED GLOBAL)

add_dependencies(exif ${exif})

set_target_properties(
  exif
  PROPERTIES
  IMPORTED_LOCATION "${exif_PREFIX}/lib/${lib}"
)

file(MAKE_DIRECTORY "${exif_PREFIX}/include")

target_include_directories(
  exif
  INTERFACE "${exif_PREFIX}/include"
)
