#include <assert.h>
#include <bare.h>
#include <js.h>
#include <libexif/exif-data.h>
#include <libexif/exif-tag.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
  ExifData *handle;
} bare_exif_data_t;

typedef struct {
  ExifEntry *handle;
} bare_exif_entry_t;

static void
bare_exif_finalize_data(js_env_t *env, void *data, void *hint) {
  bare_exif_data_t *self = data;

  if (self->handle != NULL) exif_data_unref(self->handle);

  free(self);
}

static void
bare_exif_finalize_entry(js_env_t *env, void *data, void *hint) {
  // An entry is owned by the data tree it was read from, so only the wrapper
  // is ours to free.
  free(data);
}

static bare_exif_data_t *
bare_exif__unwrap_data(js_env_t *env, js_value_t *object) {
  int err;

  bare_exif_data_t *data;
  err = js_unwrap(env, object, (void **) &data);
  assert(err == 0);

  if (data->handle == NULL) {
    err = js_throw_error(env, NULL, "EXIF data has been destroyed");
    assert(err == 0);

    return NULL;
  }

  return data;
}

static bare_exif_entry_t *
bare_exif__unwrap_entry(js_env_t *env, js_value_t *object) {
  int err;

  bare_exif_entry_t *entry;
  err = js_unwrap(env, object, (void **) &entry);
  assert(err == 0);

  if (entry->handle == NULL) {
    err = js_throw_error(env, NULL, "EXIF entry has been destroyed");
    assert(err == 0);

    return NULL;
  }

  return entry;
}

static js_value_t *
bare_exif_init_data(js_env_t *env, js_callback_info_t *info) {
  int err;

  size_t argc = 4;
  js_value_t *argv[4];

  err = js_get_callback_info(env, info, &argc, argv, NULL, NULL);
  assert(err == 0);

  assert(argc == 4);

  uint8_t *buffer;
  size_t buffer_cap;
  err = js_get_arraybuffer_info(env, argv[1], (void **) &buffer, &buffer_cap);
  assert(err == 0);

  int64_t offset;
  err = js_get_value_int64(env, argv[2], &offset);
  assert(err == 0);

  int64_t len;
  err = js_get_value_int64(env, argv[3], &len);
  assert(err == 0);

  if (offset < 0 || len < 0 || offset + len > (int64_t) buffer_cap) {
    err = js_throw_range_error(env, NULL, "Buffer out of range");
    assert(err == 0);

    return NULL;
  }

  ExifData *handle = exif_data_new_from_data(&buffer[offset], len);

  if (handle == NULL) {
    err = js_throw_error(env, NULL, "Failed to load EXIF data");
    assert(err == 0);

    return NULL;
  }

  bare_exif_data_t *data = malloc(sizeof(bare_exif_data_t));

  data->handle = handle;

  err = js_wrap(env, argv[0], data, bare_exif_finalize_data, NULL, NULL);
  assert(err == 0);

  return NULL;
}

static js_value_t *
bare_exif_destroy_data(js_env_t *env, js_callback_info_t *info) {
  int err;

  size_t argc = 1;
  js_value_t *argv[1];

  err = js_get_callback_info(env, info, &argc, argv, NULL, NULL);
  assert(err == 0);

  assert(argc == 1);

  bare_exif_data_t *data;
  err = js_unwrap(env, argv[0], (void **) &data);
  assert(err == 0);

  if (data->handle != NULL) {
    exif_data_unref(data->handle);

    data->handle = NULL;
  }

  return NULL;
}

static js_value_t *
bare_exif_init_entry(js_env_t *env, js_callback_info_t *info) {
  int err;

  size_t argc = 3;
  js_value_t *argv[3];

  err = js_get_callback_info(env, info, &argc, argv, NULL, NULL);
  assert(err == 0);

  assert(argc == 3);

  bare_exif_data_t *data = bare_exif__unwrap_data(env, argv[1]);

  if (data == NULL) return NULL;

  int64_t exif_tag;
  err = js_get_value_int64(env, argv[2], &exif_tag);
  assert(err == 0);

  ExifEntry *handle = exif_data_get_entry(data->handle, (ExifTag) exif_tag);

  if (handle == NULL) return NULL;

  bare_exif_entry_t *entry = malloc(sizeof(bare_exif_entry_t));

  entry->handle = handle;

  err = js_wrap(env, argv[0], entry, bare_exif_finalize_entry, NULL, NULL);
  assert(err == 0);

  int tag = handle->tag;
  int format = handle->format;
  unsigned long components = handle->components;
  unsigned int size = handle->size;
  ExifByteOrder byteOrder = exif_data_get_byte_order(handle->parent->parent);

#define V(n) \
  { \
    js_value_t *val; \
    err = js_create_int64(env, n, &val); \
    assert(err == 0); \
    err = js_set_named_property(env, argv[0], #n, val); \
    assert(err == 0); \
  }

  V(tag);
  V(format);
  V(components);
  V(size);
  V(byteOrder);
#undef V

  // A borrowed view into the entry, detached again by destroyEntry() before
  // the data tree it points into can be freed.
  js_value_t *buffer;
  err = js_create_external_arraybuffer(env, handle->data, handle->size, NULL, NULL, &buffer);
  assert(err == 0);

  err = js_set_named_property(env, argv[0], "data", buffer);
  assert(err == 0);

  return argv[0];
}

static js_value_t *
bare_exif_destroy_entry(js_env_t *env, js_callback_info_t *info) {
  int err;

  size_t argc = 2;
  js_value_t *argv[2];

  err = js_get_callback_info(env, info, &argc, argv, NULL, NULL);
  assert(err == 0);

  assert(argc == 2);

  bare_exif_entry_t *entry;
  err = js_unwrap(env, argv[0], (void **) &entry);
  assert(err == 0);

  if (entry->handle != NULL) {
    entry->handle = NULL;

    err = js_detach_arraybuffer(env, argv[1]);
    assert(err == 0);
  }

  return NULL;
}

static js_value_t *
bare_exif_get_entry_value(js_env_t *env, js_callback_info_t *info) {
  int err;

  size_t argc = 1;
  js_value_t *argv[1];

  err = js_get_callback_info(env, info, &argc, argv, NULL, NULL);
  assert(err == 0);

  assert(argc == 1);

  bare_exif_entry_t *entry = bare_exif__unwrap_entry(env, argv[0]);

  if (entry == NULL) return NULL;

  char text[1024];
  exif_entry_get_value(entry->handle, text, sizeof(text));

  js_value_t *result;
  err = js_create_string_utf8(env, (utf8_t *) text, strlen(text), &result);
  assert(err == 0);

  return result;
}

static js_value_t *
bare_exif_remove_entry(js_env_t *env, js_callback_info_t *info) {
  int err;

  size_t argc = 2;
  js_value_t *argv[2];

  err = js_get_callback_info(env, info, &argc, argv, NULL, NULL);
  assert(err == 0);

  assert(argc == 2);

  bare_exif_data_t *data = bare_exif__unwrap_data(env, argv[0]);

  if (data == NULL) return NULL;

  int64_t exif_tag;
  err = js_get_value_int64(env, argv[1], &exif_tag);
  assert(err == 0);

  ExifEntry *entry = exif_data_get_entry(data->handle, (ExifTag) exif_tag);

  if (entry != NULL) {
    exif_content_remove_entry(entry->parent, entry);
  }

  return NULL;
}

static js_value_t *
bare_exif_save_data(js_env_t *env, js_callback_info_t *info) {
  int err;

  size_t argc = 1;
  js_value_t *argv[1];

  err = js_get_callback_info(env, info, &argc, argv, NULL, NULL);
  assert(err == 0);

  assert(argc == 1);

  bare_exif_data_t *data = bare_exif__unwrap_data(env, argv[0]);

  if (data == NULL) return NULL;

  unsigned char *bytes = NULL;
  unsigned int len = 0;
  exif_data_save_data(data->handle, &bytes, &len);

  js_value_t *result;
  void *output;
  err = js_create_arraybuffer(env, len, &output, &result);
  assert(err == 0);

  if (len > 0) {
    memcpy(output, bytes, len);
    free(bytes);
  }

  return result;
}

static js_value_t *
bare_exif_exports(js_env_t *env, js_value_t *exports) {
  int err;

  js_value_t *ifds;
  err = js_create_object(env, &ifds);
  assert(err == 0);

  err = js_set_named_property(env, exports, "ifds", ifds);
  assert(err == 0);

#define V(ifd) \
  { \
    js_value_t *val; \
    err = js_create_uint32(env, EXIF_IFD_##ifd, &val); \
    assert(err == 0); \
    err = js_set_named_property(env, ifds, #ifd, val); \
    assert(err == 0); \
  }

  V(0)
  V(1)
  V(EXIF)
  V(GPS)
  V(INTEROPERABILITY)
#undef V

  js_value_t *tags;
  err = js_create_object(env, &tags);
  assert(err == 0);

  err = js_set_named_property(env, exports, "tags", tags);
  assert(err == 0);

#define V(tag) \
  { \
    js_value_t *val; \
    err = js_create_uint32(env, EXIF_TAG_##tag, &val); \
    assert(err == 0); \
    err = js_set_named_property(env, tags, #tag, val); \
    assert(err == 0); \
  }

  V(APERTURE_VALUE)
  V(ARTIST)
  V(BATTERY_LEVEL)
  V(BITS_PER_SAMPLE)
  V(BODY_SERIAL_NUMBER)
  V(BRIGHTNESS_VALUE)
  V(CAMERA_OWNER_NAME)
  V(CFA_PATTERN)
  V(CFA_REPEAT_PATTERN_DIM)
  V(COLOR_SPACE)
  V(COMPONENTS_CONFIGURATION)
  V(COMPOSITE_IMAGE)
  V(COMPRESSED_BITS_PER_PIXEL)
  V(COMPRESSION)
  V(CONTRAST)
  V(COPYRIGHT)
  V(CUSTOM_RENDERED)
  V(DATE_TIME)
  V(DATE_TIME_DIGITIZED)
  V(DATE_TIME_ORIGINAL)
  V(DEVICE_SETTING_DESCRIPTION)
  V(DIGITAL_ZOOM_RATIO)
  V(DOCUMENT_NAME)
  V(EXIF_IFD_POINTER)
  V(EXIF_VERSION)
  V(EXPOSURE_BIAS_VALUE)
  V(EXPOSURE_INDEX)
  V(EXPOSURE_MODE)
  V(EXPOSURE_PROGRAM)
  V(EXPOSURE_TIME)
  V(FILE_SOURCE)
  V(FILL_ORDER)
  V(FLASH)
  V(FLASH_ENERGY)
  V(FLASH_PIX_VERSION)
  V(FNUMBER)
  V(FOCAL_LENGTH)
  V(FOCAL_LENGTH_IN_35MM_FILM)
  V(FOCAL_PLANE_RESOLUTION_UNIT)
  V(FOCAL_PLANE_X_RESOLUTION)
  V(FOCAL_PLANE_Y_RESOLUTION)
  V(GAIN_CONTROL)
  V(GAMMA)
  V(GPS_ALTITUDE)
  V(GPS_ALTITUDE_REF)
  V(GPS_AREA_INFORMATION)
  V(GPS_DATE_STAMP)
  V(GPS_DEST_BEARING)
  V(GPS_DEST_BEARING_REF)
  V(GPS_DEST_DISTANCE)
  V(GPS_DEST_DISTANCE_REF)
  V(GPS_DEST_LATITUDE)
  V(GPS_DEST_LATITUDE_REF)
  V(GPS_DEST_LONGITUDE)
  V(GPS_DEST_LONGITUDE_REF)
  V(GPS_DIFFERENTIAL)
  V(GPS_DOP)
  V(GPS_H_POSITIONING_ERROR)
  V(GPS_IMG_DIRECTION)
  V(GPS_IMG_DIRECTION_REF)
  V(GPS_INFO_IFD_POINTER)
  V(GPS_LATITUDE)
  V(GPS_LATITUDE_REF)
  V(GPS_LONGITUDE)
  V(GPS_LONGITUDE_REF)
  V(GPS_MAP_DATUM)
  V(GPS_MEASURE_MODE)
  V(GPS_PROCESSING_METHOD)
  V(GPS_SATELLITES)
  V(GPS_SPEED)
  V(GPS_SPEED_REF)
  V(GPS_STATUS)
  V(GPS_TIME_STAMP)
  V(GPS_TRACK)
  V(GPS_TRACK_REF)
  V(GPS_VERSION_ID)
  V(IMAGE_DEPTH)
  V(IMAGE_DESCRIPTION)
  V(IMAGE_LENGTH)
  V(IMAGE_RESOURCES)
  V(IMAGE_UNIQUE_ID)
  V(IMAGE_WIDTH)
  V(INTEROPERABILITY_IFD_POINTER)
  V(INTEROPERABILITY_INDEX)
  V(INTEROPERABILITY_VERSION)
  V(INTER_COLOR_PROFILE)
  V(IPTC_NAA)
  V(ISO_SPEED)
  V(ISO_SPEEDLatitudeYYY)
  V(ISO_SPEEDLatitudeZZZ)
  V(ISO_SPEED_RATINGS)
  V(JPEG_INTERCHANGE_FORMAT)
  V(JPEG_INTERCHANGE_FORMAT_LENGTH)
  V(JPEG_PROC)
  V(LENS_MAKE)
  V(LENS_MODEL)
  V(LENS_SERIAL_NUMBER)
  V(LENS_SPECIFICATION)
  V(LIGHT_SOURCE)
  V(MAKE)
  V(MAKER_NOTE)
  V(MAX_APERTURE_VALUE)
  V(METERING_MODE)
  V(MODEL)
  V(NEW_CFA_PATTERN)
  V(NEW_SUBFILE_TYPE)
  V(OECF)
  V(OFFSET_TIME)
  V(OFFSET_TIME_DIGITIZED)
  V(OFFSET_TIME_ORIGINAL)
  V(ORIENTATION)
  V(PADDING)
  V(PHOTOMETRIC_INTERPRETATION)
  V(PIXEL_X_DIMENSION)
  V(PIXEL_Y_DIMENSION)
  V(PLANAR_CONFIGURATION)
  V(PRIMARY_CHROMATICITIES)
  V(PRINT_IMAGE_MATCHING)
  V(RECOMMENDED_EXPOSURE_INDEX)
  V(REFERENCE_BLACK_WHITE)
  V(RELATED_IMAGE_FILE_FORMAT)
  V(RELATED_IMAGE_LENGTH)
  V(RELATED_IMAGE_WIDTH)
  V(RELATED_SOUND_FILE)
  V(RESOLUTION_UNIT)
  V(ROWS_PER_STRIP)
  V(SAMPLES_PER_PIXEL)
  V(SATURATION)
  V(SCENE_CAPTURE_TYPE)
  V(SCENE_TYPE)
  V(SENSING_METHOD)
  V(SENSITIVITY_TYPE)
  V(SHARPNESS)
  V(SHUTTER_SPEED_VALUE)
  V(SOFTWARE)
  V(SOURCE_EXPOSURE_TIMES_OF_COMPOSITE_IMAGE)
  V(SOURCE_IMAGE_NUMBER_OF_COMPOSITE_IMAGE)
  V(SPATIAL_FREQUENCY_RESPONSE)
  V(SPECTRAL_SENSITIVITY)
  V(STANDARD_OUTPUT_SENSITIVITY)
  V(STRIP_BYTE_COUNTS)
  V(STRIP_OFFSETS)
  V(SUBJECT_AREA)
  V(SUBJECT_DISTANCE)
  V(SUBJECT_DISTANCE_RANGE)
  V(SUBJECT_LOCATION)
  V(SUB_IFDS)
  V(SUB_SEC_TIME)
  V(SUB_SEC_TIME_DIGITIZED)
  V(SUB_SEC_TIME_ORIGINAL)
  V(TIFF_EP_STANDARD_ID)
  V(TIME_ZONE_OFFSET)
  V(TRANSFER_FUNCTION)
  V(TRANSFER_RANGE)
  V(USER_COMMENT)
  V(WHITE_BALANCE)
  V(WHITE_POINT)
  V(XML_PACKET)
  V(XP_AUTHOR)
  V(XP_COMMENT)
  V(XP_KEYWORDS)
  V(XP_SUBJECT)
  V(XP_TITLE)
  V(X_RESOLUTION)
  V(YCBCR_COEFFICIENTS)
  V(YCBCR_POSITIONING)
  V(YCBCR_SUB_SAMPLING)
  V(Y_RESOLUTION)
#undef V

  js_value_t *formats;
  err = js_create_object(env, &formats);
  assert(err == 0);

  err = js_set_named_property(env, exports, "formats", formats);
  assert(err == 0);

#define V(format) \
  { \
    js_value_t *val; \
    err = js_create_uint32(env, EXIF_FORMAT_##format, &val); \
    assert(err == 0); \
    err = js_set_named_property(env, formats, #format, val); \
    assert(err == 0); \
  }

  V(BYTE)
  V(ASCII)
  V(SHORT)
  V(LONG)
  V(RATIONAL)
  V(SBYTE)
  V(UNDEFINED)
  V(SSHORT)
  V(SLONG)
  V(SRATIONAL)
  V(FLOAT)
  V(DOUBLE)
#undef V

  js_value_t *byte_orders;
  err = js_create_object(env, &byte_orders);
  assert(err == 0);

  err = js_set_named_property(env, exports, "byteOrders", byte_orders);
  assert(err == 0);

#define V(byte_order) \
  { \
    js_value_t *val; \
    err = js_create_uint32(env, EXIF_BYTE_ORDER_##byte_order, &val); \
    assert(err == 0); \
    err = js_set_named_property(env, byte_orders, #byte_order, val); \
    assert(err == 0); \
  }

  V(MOTOROLA)
  V(INTEL)
#undef V

#define V(name, fn) \
  { \
    js_value_t *val; \
    err = js_create_function(env, name, -1, fn, NULL, &val); \
    assert(err == 0); \
    err = js_set_named_property(env, exports, name, val); \
    assert(err == 0); \
  }

  V("initData", bare_exif_init_data)
  V("destroyData", bare_exif_destroy_data)
  V("initEntry", bare_exif_init_entry)
  V("destroyEntry", bare_exif_destroy_entry)
  V("entryValue", bare_exif_get_entry_value)
  V("removeEntry", bare_exif_remove_entry)
  V("saveData", bare_exif_save_data)
#undef V

  return exports;
}

BARE_MODULE(bare_exif, bare_exif_exports)
