import pandas as pd
from util import *
import re
import numpy as np
from speckNameToHealthId import *
from scipy.stats import zscore

# Build the device information table
def createDeviceInfoTable(fpath_in, fpath_out, file_type):
    logger = generateLogger("log.log")
    log("=====================================================================", logger)
    log("=============== START creating device info table ====================", logger)

    # Check if path exists
    checkAndCreateDir(fpath_out)

    # Read a list of file names
    fname_in_all = getAllFileNamesInFolder(fpath_in[0])
    
    # Read and parse the user information table
    df_usr = pd.read_csv(fpath_in[1])
    df_health = pd.read_csv(fpath_in[2])
    usr = {} # map speck number (house ID) to zipcode
    health = {} # map speck id to health id
    if file_type == "old":
        df_usr.apply(lambda row: parseUsrRowOld(row, usr), axis=1)
        df_health.apply(lambda row: parseHealthRowOld(row, health), axis=1)
    else:
        df_usr.apply(lambda row: parseUsrRowNew(row, usr), axis=1)
        df_health.apply(lambda row: parseHealthRowNew(row, health), axis=1)

    # Read the old device information table and see if files are parsed before
    tb = []
    processed_speck_names = []
    if os.path.isfile(fpath_out):
        df_old = pd.read_csv(fpath_out)
        tb = df_old.values.tolist()
        processed_speck_names = df_old["speck name"].values

    # Create the device information table in parallel
    for fname_in in fname_in_all:
        r = parseOneFile(fpath_in[0], fname_in, file_type, usr, health, processed_speck_names, logger)
        if r is not None:
            tb.append(r)

    # Save table
    col_names = ["speck name", "zipcode", "health code",
        "PM baseline", "Peaks per day",
        "Peak duration (mins)", "Hours between peaks",
        "Accumulation per day"]
    pd.DataFrame(data=tb, columns=col_names).to_csv(fpath_out, index=False)
    log("Device table created at " + fpath_out, logger)

    log("================= END creating device info table ====================", logger)
    log("=====================================================================", logger)

def parseOneFile(fpath_in, fname_in, file_type, usr, health, processed_speck_names, logger):
    speck_name = getBaseName(fname_in)
   
    # Return if file was processed
    if speck_name in processed_speck_names:
        log("File '" + fname_in + "' was processed before", logger)
        return None

    log("Process file '" + fname_in + "'", logger)
    k = findHouseIdOrSpeckNum(fname_in, file_type)

    # Return if no house id or Speck number is found
    if k is None:
        log("File name '" + fname_in + "' does not contain a Speck number", logger, level="error")
        return None

    # Check if has zipcode
    if k not in usr:
        log("Speck '" + speck_name + "' has no valid zipcode", logger, level="error")
        return None
    
    # The row to return
    r = None

    # Load data
    speck_json = loadJson(fpath_in + fname_in)

    # If there are multiple zipcodes, use the one that has the smallest difference
    # between the starting time and the device given time
    zipcode = usr[k]["zipcode"]
    if len(zipcode) == 1:
        log("Speck '" + speck_name + "' has zipcode " + str(zipcode[0]), logger)
        r = [speck_name, zipcode[0]]
    else:
        start_t = speck_json["data"][0][0]
        given_t = usr[k]["given_time"]
        start_t_all = [start_t for i in range(0, len(zipcode))]
        diff_t = abs(np.array(given_t) - start_t_all)
        # Find the index that has the closest device given time 
        idx = np.argmin(diff_t)
        # Check if the difference is not too large
        diff_hrs = diff_t[idx] / 3600
        if diff_hrs < 504:
            log("Speck '" + speck_name + "' has zipcode " + str(zipcode[idx]) + " with " + str(diff_hrs) + " hrs difference", logger)
            r = [speck_name, zipcode[idx]]
        else:
            log("Speck '" + speck_name + "' takes too long (" + str(diff_hrs) + " hrs) to start after being given", logger, level="error")
    if r is None: return None

    # Add health information
    if speck_name in health:
        r.append(health[speck_name])
    else:
        r.append(None)
    
    # Add Speck analysis statistics
    s = computeSpeckStatistics(speck_json, speck_name, logger)
    if s is None: return None
    r += s
    
    log("Speck '" + speck_name + "' return " + str(r), logger)
    return r

def computeSpeckStatistics(speck_json, speck_name, logger):
    # Sanity check
    try:
        data = np.array(speck_json["data"], dtype=float)
    except:
        log("Data type is not consistent for Speck " + speck_name, logger, level="error")
        return None
                      
    # Select the particle concentration data
    df_pm = pd.DataFrame(data=data[:, [0,1]], columns=["time", "pm"])

    # Select only valid data points (not NaN and larger than zero)
    df_pm_valid = df_pm.dropna(axis=0, how="any", subset=["pm"])
    df_pm_valid = df_pm_valid[(df_pm_valid["pm"] >= 0) & (df_pm_valid["pm"] < 10000)]
    if len(df_pm_valid) == 0:
        log("No valid data points for Speck " + speck_name, logger, level="error")
        return None

    # Correct data
    df_pm["pm"][df_pm["pm"] < 0] = np.nan
    df_pm["pm"][df_pm["pm"] >= 10000] = np.nan

    # Compute basic statistics
    pm25_mean = np.round(df_pm_valid["pm"].mean());
    pm25_std = np.round(df_pm_valid["pm"].std());

    # Compute z-score
    df_pm["zscore"] = (df_pm["pm"] - pm25_mean) / pm25_std

    # Compute consecutive peaks
    df_pm["peak"] = (df_pm["zscore"] > 2).astype("int")
    df_pm["cumSumOfPeak"] = (df_pm["peak"].diff(1) != 0).astype("int").cumsum()
    df_pm_groupby = df_pm.groupby("cumSumOfPeak")
    df_peaks = pd.DataFrame({
        "startTime" : df_pm_groupby["time"].first(),
        "endTime" : df_pm_groupby["time"].last(),
        "consecutive" : df_pm_groupby.size(),
        "peak" : df_pm_groupby["peak"].first(),
        "avg_zscore": df_pm_groupby["zscore"].mean()
    }).reset_index(drop=True)
    df_peaks = df_peaks[df_peaks["peak"] == 1].reset_index(drop=True)
    df_peaks["duration"] = df_peaks["endTime"] - df_peaks["startTime"]

    # Compute average number of peaks per day
    num_days = (data[-1][0] - data[0][0]) / 86400
    avg_num_of_peaks_per_day = float(len(df_peaks)) / num_days

    # Compute average peak duration
    avg_peak_duration_in_mins = df_peaks["duration"].mean() / 60

    # Compute average time between peaks
    avg_hours_between_peaks = df_peaks["startTime"].diff(1).dropna().mean() / 3600

    # Compute the average exposure per peak
    #avg_exposure_per_peak = (df_peaks["duration"] * df_peaks["avg_zscore"]).mean()

    # Compute the average exposure per day
    #avg_exposure_per_day = avg_exposure_per_peak * avg_num_of_peaks_per_day

    # Compute the baseline value (the 35th percentile)
    pm_baseline = df_pm_valid["pm"].quantile(q=0.35)

    # Compute the average accumulated particle concentration per day
    pm_accu = df_pm[["time", "pm"]].copy(deep=True)
    pm_accu["pm"] -= pm_baseline
    pm_accu["pm"][pm_accu["pm"] < 0] = 0
    pm_accu[["time_next", "pm_next"]] = pm_accu[["time", "pm"]].shift(-1)
    pm_accu.dropna(axis=0, how="any", inplace=True)
    pm_accu["area"] = (pm_accu["time_next"] - pm_accu["time"]) * (pm_accu["pm"] + pm_accu["pm_next"]) * 0.5
    avg_accu_pm_per_day = pm_accu["area"].sum() / (num_days * 86400)

    # Return a list of speck analysis statistics
    log("Computed statistics of Speck " + speck_name, logger)
    s = [pm_baseline, avg_num_of_peaks_per_day,
        avg_peak_duration_in_mins, avg_hours_between_peaks,
        avg_accu_pm_per_day]
    s = np.around(s, 2).tolist()
    return s

def findHouseIdOrSpeckNum(fname_in, file_type):
    speck_name = validateSpeckFileJSON(fname_in)
    if speck_name is None: return None

    if file_type == "old":
        # Find Speck number: the first number in the file name
        s = re.search('[0-9]+', speck_name)
        if s is None: return None
        else: return s.group()
    else:
        # Find houese ID
        return speck_name.split("-")[3]

def parseHealthRowOld(row, health):
    speck_name = getBaseName(row["speck_name"])
    h = row["health_id"]
    if pd.isnull(h): return
    health[speck_name] = h

def parseHealthRowNew(row, health):
    health[row["speck_name"]] = row["health_id"]

def parseUsrRowOld(row, usr):
    speck_num_all = row["speck_num"].split(",")
    z = row["zipcode"]
    t = row["given_time"]
    for k in speck_num_all:
        if k in usr:
            usr[k]["zipcode"].append(z)
            usr[k]["given_time"].append(t)
        else:
            usr[k] = {"zipcode": [z], "given_time": [t]}

def parseUsrRowNew(row, usr):
    h_id = removeNonAsciiChars(row["house_id"])
    if pd.isnull(row["zipcode"]): return
    z = int(row["zipcode"])
    if h_id in usr:
        usr[h_id]["zipcode"].append(z)
    else:
        usr[h_id] = {"zipcode": [z]}
