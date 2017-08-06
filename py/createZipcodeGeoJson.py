import json
from util import *

# Read the GeoJSON containing all US zipcode boundaries
# Read the table that maps Speck ID and zipcode
# Then output a GeoJSON containing only the zipcode boundaries which have Specks
def createZipcodeGeoJson(fpath_in, fpath_out):
    logger = generateLogger("log.log")
    logger.info("=====================================================================")
    logger.info("================= START creating zipcode GeoJSON ====================")

    # Read data tables
    logger.info("Read data table " + fpath_in[0])
    logger.info("Read data table " + fpath_in[1])
    speck_data_gp_by_zipcode = loadJson(fpath_in[0])
    health_data_gp_by_zipcode = loadJson(fpath_in[1])

    # Find all unique zipcodes
    logger.info("Find all unique zipcodes in the zipcode-device table")
    zipcodes_speck = speck_data_gp_by_zipcode.keys()
    zipcodes_health = health_data_gp_by_zipcode.keys()
    zipcodes_unique = list(set(zipcodes_speck + zipcodes_health))

    # Read the zipcode boundaries
    logger.info("Read the zipcode boundaries " + fpath_in[2])
    zipcode_boundary_all = loadJson(fpath_in[2])

    # Select only the boundaries which have Specks
    logger.info("Select only the boundaries which have Specks")
    zipcode_boundary_speck = {
        "type": "FeatureCollection",
        "features": []
    }
    for feature in zipcode_boundary_all["features"]:
        zipcode = feature["properties"]["ZCTA5CE10"]
        if zipcode in zipcodes_unique:
            zipcode_boundary_speck["features"].append(feature)

    # Write to a GeoJSON file
    logger.info("Write the boundaries into GeoJSON file " + fpath_out)
    saveJson(zipcode_boundary_speck, fpath_out)

    logger.info("=================== END creating zipcode GeoJSON ====================")
    logger.info("=====================================================================")
