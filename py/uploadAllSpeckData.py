import json
from util import *

# Upload the processed json files to ESDR
def uploadAllSpeckData(fpath_in):
    logger = generateLogger("log.log")
    logger.info("=====================================================================")
    logger.info("==================== START uploading speck data =====================")
    
    # Get access token from ESDR
    access_token, user_id = getEsdrAccessToken(fpath_in[0])
    if access_token is None: return False

    # Variables for uploading to ESDR
    fname_in_all = getAllFileNamesInFolder(fpath_in[1])
    
    # Use product ID = 9, this is for Speck 
    product_id = 9

    # Upload all data from EHP to ESDR
    logger.info("------------------------------------------------")
    for fname_in in fname_in_all:
        device_name = validateSpeckFileJSON(fname_in)
        if device_name is not None:
            device_json = loadJson(fpath_in[1] + fname_in)
            uploadDataToEsdr(device_name, device_json, product_id, access_token)
        logger.info("------------------------------------------------") 

    logger.info("===================== END uploading speck data ======================")
    logger.info("=====================================================================")

def validateSpeckFileJSON(fname_in):
    logger = generateLogger("log.log")

    # Check if the file extension is .json
    if not fname_in.endswith(".json"):
        logger.error("File name '" + fname_in + "' does not have extension .json")
        return None

    # Check id the file does not begin with ~ or .
    if fname_in.startswith("~") or fname_in.startswith("."):
        logger.error("File name '" + fname_in + "' starts with invalid '~' or '.'")
        return None

    return getBaseName(fname_in)
