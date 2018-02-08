from util import *
import pandas as pd
import json

# Create a table that maps health case ID and Speck ID
def speckNameToHealthId(fpath_in, fpath_out):
    logger = generateLogger("log.log")
    log("=====================================================================", logger)
    log("============= START mapping Speck name to health id  ================", logger)

    # Get file names of new Speck data
    fname_in_all = getAllFileNamesInFolder(fpath_in)

    # Mapping
    speck_id_to_health_id = {}
    for fname_in in fname_in_all:
        speck_id = validateSpeckFileJSON(fname_in)
        if speck_id is None: continue
        s = speck_id.split("-")
        health_id = s[2]
        if health_id == "000000": continue
        speck_id_to_health_id[speck_id] = {"health_id": health_id}
    
    # Save file
    log("Map Speck id to health id at " + fpath_out, logger)
    df = pd.read_json(json.dumps(speck_id_to_health_id), orient="index")
    df.reset_index().rename(columns={"index": "speck_name"}).to_csv(fpath_out, index=False)

    log("============== END mapping Speck name to health id  =================", logger)
    log("=====================================================================", logger)

def validateSpeckFileJSON(fname_in): 
    logger = generateLogger("log.log") 

    # Check if the file extension is .json 
    if not fname_in.endswith(".json"): 
        log("File name '" + fname_in + "' does not have extension .json", logger, level="error")
        return None 

    # Check id the file does not begin with ~ or . 
    if fname_in.startswith("~") or fname_in.startswith("."): 
        log("File name '" + fname_in + "' starts with invalid '~' or '.'", logger, level="error")
        return None 

    return getBaseName(fname_in) 
