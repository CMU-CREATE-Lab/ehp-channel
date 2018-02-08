import pandas as pd
from util import *
import re
import geocoder
import time

# Read the old user information that EHP provides
# Then simplify the table to Speck number, zipcode, and device given time
def simplifyOldUserInfo(fpath_in, fpath_out):
    logger = generateLogger("log.log")
    log("=====================================================================", logger)
    log("============== START simplifying old EHP use info  ==================", logger)

    # Read the old information provided by EHP
    # We need to get three columns out from this file: address, speck number, and device given date
    # Also this file has two sheets
    log("Read excel file " + fpath_in, logger)
    df0 = pd.read_excel(fpath_in, sheetname=0)
    df0 = df0[["Speck ID #'s", "Resident Address", "Date given"]]
    df0.columns = ["speck_num", "address", "given_time"]
    df1 = pd.read_excel(fpath_in, sheetname=1)
    df1 = df1[["Speck Number", "User address", "Date given"]]
    df1.columns = ["speck_num", "address", "given_time"]
    df_raw = pd.concat([df0, df1]).reset_index(drop=True)

    # Clean up each row
    df = df_raw.apply(simplifyRow, axis=1).dropna(axis=0, how="any").reset_index(drop=True)
    df.to_csv(fpath_out, index=False)
    log("Simplified user info saved at " + fpath_out, logger)

    log("================ END simplifying old EHP use info  ==================", logger)
    log("=====================================================================", logger)

def simplifyRow(row):
    logger = generateLogger("log.log")

    # Simplify Speck number
    speck_num_all = re.findall("\d+", unicode(row["speck_num"]))
    if len(speck_num_all) == 0:
        row["speck_num"] = None
    else:
        row["speck_num"] = unicode(",".join(speck_num_all))
   
    # Convert device given date to epochtime
    t = row["given_time"]
    if not pd.isnull(t):
        if type(t) is unicode:
            row["given_time"] = None
        else:
            row["given_time"] = int(datetimeToEpochtime(t) / 1000)

    # Detect if there is address and geocode it
    addr = row["address"]
    row["zipcode"] = "unknown"
    if not pd.isnull(addr):
        addr = removeNonAsciiChars(unicode(row["address"]))
        row["address"] = addr
        g = geocoder.google(addr)
        time.sleep(1) # Pause for a while to avoid the query limit
        while True:
            if g.json is None:
                log(addr + " cannot be geocoded", logger)
                break
            status = g.json["status"]
            if status == "OK":
                if g.postal is not None:
                    row["zipcode"] = g.postal
                    log(addr + " has zipcode " + g.postal, logger)
                else:
                    log("Cannot find zipcode for " + addr, logger, level="error")
                break
            elif status == "OVER_QUERY_LIMIT":
                log("Over query limit, will try again", logger)
                time.sleep(10) # Pause for a while
                continue
            else:
                log(addr + "cannot be geocoded with error status " + status, logger, level="error")
                break

    return row
