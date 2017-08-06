import pandas as pd
from util import *
import json
import numpy as np

# Read the information files (maps Speck number or house ID to zipcode) and the device-feed table
# Then output a machine readable file that maps zipcode and device ID
def createZipcodeDeviceTable(fpath_in, fpath_out):
    logger = generateLogger("log.log")
    logger.info("=====================================================================")
    logger.info("============== START creating zipcode-device table ==================")

    # Read the device-feed table
    logger.info("Read the device feed table " + fpath_in[0])
    device_feed_tb = loadJson(fpath_in[0])

    # Temp table for storing the mapping of device number and house ID
    tmp = {}

    # Read the old information provided by EHP
    # We need to get three columns out from this file: zipcode, speck number, and device given time
    # Also this file has two sheets
    logger.info("Read old user info " + fpath_in[1])
    df_old = pd.read_csv(fpath_in[1])
    df_old = df_old.apply(lambda row: parseRowOld(row, tmp), axis=1) 
    
    # Read the new information provided by EHP
    logger.info("Read new user info " + fpath_in[2])
    df_new = pd.read_excel(fpath_in[2])
    df_new.dropna(axis=0, how="any", inplace=True)
    df_new.columns = ["house_id", "zipcode"]
    df_new = df_new.apply(lambda row: parseRowNew(row, tmp), axis=1)
    
    # Construct the device zipcode table
    device_zipcode_tb = {}
    for d_id in device_feed_tb["data"]:
        d_id_split = d_id.split("-")
        id_part = d_id_split[0]
        start_t = int(d_id_split[1])
        # Check if id_part has zipcode
        if id_part in tmp:
            zipcode = tmp[id_part]["zipcode"]
            # If there are multiple zipcodes, use the one that has the smallest difference
            # between the starting time and the device given time
            if len(zipcode) == 1:
                device_zipcode_tb[d_id] = zipcode[0]
                logger.info("Speck " + d_id + " has zipcode " + str(zipcode[0]))
            else:
                given_t = tmp[id_part]["given_time"]
                start_t_all = [start_t for i in range(0, len(zipcode))]
                diff_t = abs(np.array(given_t) - start_t_all)
                # Find the index that has the closest device given time 
                idx = np.argmin(diff_t)
                # Check if the difference is not too large
                diff_hrs = diff_t[idx] / 3600
                if diff_hrs < 504:
                    device_zipcode_tb[d_id] = zipcode[idx]
                    logger.info("Speck " + d_id + " has zipcode " + str(zipcode[idx]) + " with " + str(diff_hrs) + " hours difference")
                else:
                    logger.error("Speck " + d_id + " takes too long (" + str(diff_hrs) + " hours) to start after being given")
        else:
            logger.error("Speck " + d_id + " has no valid zipcode")

    # Flip dictionary
    zipcode_device_tb = {
        "format": {"zipcode": "[id]+"},
        "data": flipDict(device_zipcode_tb)
    }
    logger.info("Find devices in zipcodes: " + ",".join([str(k) for k in zipcode_device_tb["data"]]))

    # Save file
    logger.info("Create zipcode device table at " + fpath_out)
    saveJson(zipcode_device_tb, fpath_out)

    logger.info("================ END creating zipcode-device table ==================")
    logger.info("=====================================================================")

def parseRowOld(row, tmp):
    speck_num_all = row["speck_num"].split(",")
    z = row["zipcode"]
    t = row["given_time"]
    for k in speck_num_all:
        if k in tmp:
            tmp[k]["zipcode"].append(z)
            tmp[k]["given_time"].append(t)
        else:
            tmp[k] = {"zipcode": [z], "given_time": [t]}

def parseRowNew(row, tmp):
    h_id = removeNonAsciiChars(row["house_id"])
    z = int(row["zipcode"])
    if h_id in tmp:
        tmp[h_id]["zipcode"].append(z)
    else:
        tmp[h_id] = {"zipcode": [z]}
