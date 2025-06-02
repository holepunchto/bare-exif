cmake_minimum_required(VERSION 3.31)

find_package(cmake-bare REQUIRED PATHS node_modules/cmake-bare)
find_package(cmake-ports REQUIRED PATHS node_modules/cmake-ports)

project(bare_exif C)

find_port(libexif)

add_bare_module(bare_exif)

target_sources(
  ${bare_exif}
  PRIVATE
    binding.c
)

target_link_libraries(
  ${bare_exif}
  PUBLIC
    exif
)
