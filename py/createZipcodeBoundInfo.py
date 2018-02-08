import json
from shapely.geometry import mapping, shape
from util import *

# This function reads the GeoJSON zipcode boundaries which have Specks
# Then outputs a table that maps zipcode, bound, and center location of the polygons
def createZipcodeBoundInfo(fpath_in, fpath_out):
    logger = generateLogger("log.log")
    log("=====================================================================", logger)
    log("=============== START creating zipcode-bound table ==================", logger)

    # Read the zipcode boundaries which have Specks
    log("Read the zipcode-boundary GeoJSON " + fpath_in, logger)
    zipcode_boundary = loadJson(fpath_in)
    
    # Compute the bound and center of each polygon
    log("Compute bounds and centers of polygons in the GeoJSON", logger)
    zipcode_bound_tb = {
        "format": {"zipcode": ["min_lng", "min_lat", "max_lng", "max_lat", "center_lng", "center_lat"]},
        "data": {}
    }
    for feature in zipcode_boundary["features"]:
        zipcode = feature["properties"]["ZCTA5CE10"]
        geometry = shape(feature["geometry"])
        b = geometry.bounds
        c = [(b[0]+b[2])/2, (b[1]+b[3])/2]
        zipcode_bound_tb["data"][zipcode] = list(b) + c

    # Write zipcode_device_table to a file
    log("Create zipcode-bound table at " + fpath_out, logger)
    saveJson(zipcode_bound_tb, fpath_out)

    log("================ END creating zipcode-bound table ===================", logger)
    log("=====================================================================", logger)
