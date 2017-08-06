import pandas as pd
import json
from util import *

# Read the health data and device-feed table
# Then output two tables: (1) zipcode to health case ID, (2) health case ID to health statistics
def createHealthDataRelatedTables(fpath_in, fpath_out):
    logger = generateLogger("log.log")
    logger.info("=====================================================================")
    logger.info("=========== START creating health data related tables ===============")

    # Read the health data
    logger.info("Read the health data " + fpath_in)
    df = pd.read_excel(fpath_in, sheetname=0)

    # Delete and rename columns
    del df["MCF"]
    del df["MCF lov/high"]
    df.rename(columns={"zip code/mcf": "zipcode", "LW CASE ID": "id"}, inplace=True)
    df.columns = df.columns.str.strip()

    # Delete the last two rows because they are summaries
    df.drop(df.index[-2:], inplace=True)
    
    # Clean up data
    df["id"] = df["id"].astype(str).str.strip(", ")

    # Create zipcode health table
    zipcode_health_tb = {
        "data": {},
        "format": {"zipcode": "[id]+"}
    }
    df.apply(lambda row: addZipcodeHealthEntry(row, zipcode_health_tb["data"]), axis=1)
    logger.info("Find health data in zipcodes: " + ",".join([str(k) for k in zipcode_health_tb["data"]]))

    # Save file
    logger.info("Create zipcode health table at " + fpath_out[0])
    saveJson(zipcode_health_tb, fpath_out[0])

    # Delete zipcode from data frame and save it
    del df["zipcode"]
    logger.info("Create health statistics table at " + fpath_out[1])
    df.to_csv(fpath_out[1], index=False)

    logger.info("============ END creating health data related tables ================")
    logger.info("=====================================================================")

def addZipcodeHealthEntry(row, tb):
    zipcode = row["zipcode"]
    health_id = row["id"]
    if zipcode in tb:
        tb[zipcode].append(health_id)
    else:
        tb[zipcode] = [health_id]
