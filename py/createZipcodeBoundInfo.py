import json
from shapely.geometry import mapping, shape
from util import *

# This function reads the GeoJSON zipcode boundaries which have Specks
# Then outputs a table that maps zipcode, bound, and center location of the polygons
def createZipcodeBoundInfo(fpath_in, fpath_out):
    logger = generateLogger("log.log")
    logger.info("=====================================================================")
    logger.info("=============== START creating zipcode-bound table ==================")

    # Read the zipcode boundaries which have Specks
    logger.info("Read the zipcode-boundary GeoJSON " + fpath_in)
    zipcode_boundary = loadJson(fpath_in)
    
    # Compute the bound and center of each polygon
    logger.info("Compute bounds and centers of polygons in the GeoJSON")
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
    logger.info("Create zipcode-bound table at " + fpath_out)
    saveJson(zipcode_bound_tb, fpath_out)

    logger.info("================ END creating zipcode-bound table ===================")
    logger.info("=====================================================================")
