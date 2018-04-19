import json
from util import *

# Read the GeoJSON containing all US zipcode boundaries
# Read the table that maps Speck ID and zipcode
# Then output a GeoJSON containing only the zipcode boundaries which have Specks
def createZipcodeGeoJson(fpath_in, fpath_out):
    logger = generateLogger("log.log")
    log("=====================================================================", logger)
    log("================= START creating zipcode GeoJSON ====================", logger)

    # Read data tables
    log("Read data table " + fpath_in[0], logger)
    log("Read data table " + fpath_in[1], logger)
    speck_data_gp_by_zipcode = loadJson(fpath_in[0])
    speck_data_gp_by_zipcode = speck_data_gp_by_zipcode["All"]
    speck_data_gp_by_zipcode.pop("All", None)
    health_data_gp_by_zipcode = loadJson(fpath_in[1])
    health_data_gp_by_zipcode = health_data_gp_by_zipcode["All"]
    health_data_gp_by_zipcode.pop("All", None)

    # Find all unique zipcodes
    log("Find all unique zipcodes in the zipcode-device table", logger)
    zipcodes_speck = speck_data_gp_by_zipcode.keys()
    zipcodes_health = health_data_gp_by_zipcode.keys()
    zipcodes_unique = list(set(zipcodes_speck + zipcodes_health))

    # Read the zipcode boundaries
    log("Read the zipcode boundaries " + fpath_in[2], logger)
    zipcode_boundary_all = loadJson(fpath_in[2])

    # Select only the boundaries which have Specks
    log("Select only the boundaries which have Specks", logger)
    zipcode_boundary_speck = {
        "type": "FeatureCollection",
        "features": []
    }
    for feature in zipcode_boundary_all["features"]:
        zipcode = feature["properties"]["ZCTA5CE10"]
        if zipcode in zipcodes_unique:
            zipcode_boundary_speck["features"].append(feature)

    # Write to a GeoJSON file
    log("Write the boundaries into GeoJSON file " + fpath_out, logger)
    saveJson(zipcode_boundary_speck, fpath_out)

    log("=================== END creating zipcode GeoJSON ====================", logger)
    log("=====================================================================", logger)
