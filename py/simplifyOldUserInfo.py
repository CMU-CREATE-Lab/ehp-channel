import pandas as pd
from util import *
import re
import geocoder
import time

# Read the old user information that EHP provides
# Then simplify the table to Speck number, zipcode, and device given time
def simplifyOldUserInfo(fpath_in, fpath_out):
    logger = generateLogger("log.log")
    logger.info("=====================================================================")
    logger.info("============== START simplifying old EHP use info  ==================")

    # Read the old information provided by EHP
    # We need to get three columns out from this file: address, speck number, and device given date
    # Also this file has two sheets
    logger.info("Read excel file " + fpath_in)
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
    logger.info("Simplified user info saved at " + fpath_out)

    logger.info("================ END simplifying old EHP use info  ==================")
    logger.info("=====================================================================")

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
        status = g.json["status"]
        time.sleep(0.2) # Pause for a while to avoid the query limit
        while True:
            if status == "OK":
                if g.postal is not None:
                    row["zipcode"] = g.postal
                    logger.info(addr + " has zipcode " + g.postal)
                else:
                    logger.error("Cannot find zipcode for " + addr)
                break
            elif status == "OVER_QUERY_LIMIT":
                logger.info("Over query limit, will try again")
                continue
            else:
                logger.error(addr + "cannot be geocoded with error status " + status)
                break

    return row
