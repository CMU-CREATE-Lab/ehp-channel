import json
import os
import re
from util import *
from joblib import Parallel, delayed
import time
import pandas as pd
import magic
import copy

# This function reads all raw Speck data in a folder
# , and processes them into json files that are ready for uploading to ESDR
def formatAllSpeckData(fpath_in, fpath_out):
    logger = generateLogger("log.log")
    log("=====================================================================", logger)
    log("==================== START formating speck data =====================", logger)

    # Check output directory
    checkAndCreateDir(fpath_out[0])

    # Obtain a list of file information that need to be processed
    log("Obtain a list of file names that need to be processed", logger)
    fname_in_all = getAllFileNamesInFolder(fpath_in)
    fname_out_all = getAllFileNamesInFolder(fpath_out[0])
    unprocessed = []
    for f_in in fname_in_all:
        # Check if the file was already processed
        is_processed = False
        for f_out in fname_out_all:
            if getBaseName(f_in) == getBaseName(f_out):
                # The file was processed
                is_processed = True
                fname_out_all.remove(f_out)
                break
        if is_processed:
            log("File '" + f_in + "' has been processed", logger)
        else:
            log("Add file '" + f_in + "' into the list", logger)
            unprocessed.append(f_in)

    # Start parallel processing
    log("Start parallel processing", logger)
    log("---------------------------------------------------------------------", logger)
    r = Parallel(n_jobs=-2)(delayed(formatSpeckData)(fpath_in, fpath_out[0], f) for f in unprocessed)

    # Create a table to map the original file name and the Speck ID
    df = pd.DataFrame(data=r, columns=["Original File Name", "Speck ID or Error Message"])
    df.to_csv(fpath_out[1] + "file_name_to_speck_id (created at " + str(int(time.time())) + ").csv", index=False)

    log("===================== END formating speck data ======================", logger)
    log("=====================================================================", logger)

# This function reads the raw Speck data provided by EHP
# , and converts the data to json format for uploading to ESDR
def formatSpeckData(fpath_in, fpath_out, fname_in, logger=None):
    r_msg = [fname_in]

    # Create logger 
    logger = generateLogger("log.log")

    # Check file types
    valid_ftypes = ["text/plain", "vnd.openxmlformats", "vnd.ms-excel"]
    fmime = magic.from_file(fpath_in + fname_in, mime=True)
    ftype = None
    for v in valid_ftypes:
        if v in fmime:
            ftype = v
            break
    if ftype is None:
        r_msg.append("ERROR: '" + fname_in + "' is not a plain text or excel file")
        log(r_msg[1], logger, level="error")
        return r_msg

    # Read file
    log("Read file " + fpath_in + fname_in, logger)
    if ftype == valid_ftypes[0]:
        df = pd.read_csv(fpath_in + fname_in)
    else:
        df = pd.read_excel(fpath_in + fname_in)

    # Check if the file has data
    if len(df) == 0:
        r_msg.append("ERROR: '" + fname_in + "' has no data")
        log(r_msg[1], logger, level="error")
        return r_msg

    # This is the format for uploading data to ESDR
    channel_names = ["particle_concentration", "particle_count", "raw_particles", "temperature"]
    data = {"channel_names": channel_names, "data": []}

    # Check if epoch time exists and is in the format of seconds (not miliseconds)
    # Also rename column names
    # IMPORTANT: discard files that have epochtime before Sep 2015, 1441080000 (maybe not calibrated)
    epochtime_name = "epoch_time"
    epochtime_min = 0#1441080000
    cols = df.columns.values
    cols_new = copy.deepcopy(cols)
    was_calibrated = False
    has_valid_epochtime = False
    num_of_valid_channels = 0
    for i in range(0, len(cols)):
        c = cols[i]
        if "timestamp" in c or "EpochTime" in c:
            if len(str(df[c][0])) is 10:
                has_valid_epochtime = True
                if df[c][0] > epochtime_min:
                    cols_new[i] = epochtime_name
                    was_calibrated = True
                else:
                    break
        for c_part in channel_names:
            if c_part in c:
                cols_new[i] = c_part
                num_of_valid_channels += 1
                break
    if not has_valid_epochtime:
        r_msg.append("ERROR: '" + fname_in + "' does not have valid epoch time format (in seconds)")
        log(r_msg[1], logger, level="error")
        return r_msg
    if not was_calibrated:
        r_msg.append("ERROR: '" + fname_in + "' was deployed before Sep 2015 (may not be calibrated)")
        log(r_msg[1], logger, level="error")
        return r_msg
    if num_of_valid_channels != len(channel_names):
        r_msg.append("ERROR: '" + fname_in + "' has duplicated or missing channels")
        log(r_msg[1], logger, level="error")
        return r_msg
    df.columns = cols_new

    # Check channel names
    for c in channel_names:
        if not c in df.columns:
            r_msg.append("ERROR: '" + fname_in + "' does not have channel " + c)
            log(r_msg[1], logger, level="error")
            return r_msg

    # Format data
    log("Parsing rows in '" + fname_in + "'", logger)
    selected_cols = copy.deepcopy(channel_names) # copy original column names
    selected_cols.insert(0, epochtime_name) # insert epochtime column
    df = df[selected_cols] # select columns
    df = df.apply(pd.to_numeric, errors='coerce', axis=1) # convert to numbers
    df.dropna(inplace=True, axis=0, how="any") # drop NaN
    if len(df) == 0:
        r_msg.append("ERROR: '" + fname_in + "' has no valid data points")
        log(r_msg[1], logger, level="error")
        return r_msg
    if len(df.columns) > len(channel_names) + 1:
        df = df.T.groupby(level=0).first().T # remove duplicate columns that have same column names
    df[epochtime_name] = df[epochtime_name].astype("uint64") # convert epochtime to int
    data["data"] = list(list(x) for x in zip(*(df[x].values.tolist() for x in df.columns))) # preserve type

    # Rename file with its original base name without extension
    speck_id = getBaseName(fname_in)
    fpath_full = fpath_out + speck_id + ".json"
    try:
        saveJson(data, fpath_full)
        log("ESDR json file created in " + fpath_full, logger)
        r_msg.append(speck_id)
        return r_msg
    except Exception as e:
        os.remove(fpath_full)
        log(e, logger, level="error")
        r_msg.append(e)
        return r_msg
