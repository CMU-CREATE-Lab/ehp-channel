from util import *
import pandas as pd
import json
from uploadAllSpeckData import *

# Create a table that maps health case ID and Speck ID
def speckNameToHealthId(fpath_in, fpath_out):
    logger = generateLogger("log.log")
    logger.info("=====================================================================")
    logger.info("============= START mapping Speck name to health id  ================")

    # Get file names of new Speck data
    fname_in_all = getAllFileNamesInFolder(fpath_in)

    # Mapping
    speck_id_to_health_id = {}
    for fname_in in fname_in_all:
        speck_id = validateSpeckFileJSON(fname_in, generateLogger("log.log"))
        if speck_id is None: continue
        s = speck_id.split("-")
        health_id = s[2]
        if health_id == "000000": continue
        speck_id_to_health_id[speck_id] = {"health_id": health_id}
    
    # Save file
    logger.info("Map Speck id to health id at " + fpath_out)
    df = pd.read_json(json.dumps(speck_id_to_health_id), orient="index")
    df.reset_index().rename(columns={"index": "speck_name"}).to_csv(fpath_out, index=False)

    logger.info("============== END mapping Speck name to health id  =================")
    logger.info("=====================================================================")
