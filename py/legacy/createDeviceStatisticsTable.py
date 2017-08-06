import json
import re
import numpy as np
import os
import pandas as pd
from util import *
from scipy.stats import zscore
from uploadAllSpeckData import *
import requests

# Read Speck data from ESDR and compute statistics
# Then output a table that maps Speck ID and statistics
def createDeviceStatisticsTable(fpath_in, fpath_out):
    logger = generateLogger("log.log")
    logger.info("=====================================================================")
    logger.info("============== START creating device statistics table ===============")

    # Get access token from ESDR
    access_token, user_id = getEsdrAccessToken(fpath_in[0])
    if access_token is None: return False

    # Get all Speck IDs from ESDR
    headers = {
        "Authorization": "Bearer " + access_token,
        "Content-Type": "application/json"
    }
    url = esdrRootUrl() + "api/v1/devices"
    r = requests.get(url, headers=headers)
    if r.status_code is not 200:
        logger.error("ESDR returns: " + json.dumps(r_json) + " when getting all Speck IDs")
        return False
    r_json = r.json()
    if r_json["data"]["totalCount"] < 1:
        logger.error("No Specks found")
        return False
    speck_name_to_id = {}
    for k in r_json["data"]["rows"]:
        speck_name_to_id[k["name"]] = k["id"]

    # Get the device table on Google sheet
    df = pd.read_csv(fpath_in[1])

    # Get the table that were processed before
    #if os.path.isfile(fpath_out):
    #    df_old = pd.read_csv(fpath_out)
        # Merge old and new tables


    # Create the table that maps Speck ID and statistics
    #col_names = ["speck name",
    #    "PM baseline", "Peaks per day",
    #    "Exposure per day", "Exposure per peak",
    #    "Peak duration (mins)", "Hours between peaks"]
    #data = np.empty([0, len(col_names)])

    # Compute statistics
    logger.info("------------------------------------------------")
    for fname_in in fname_in_all:
        speck_info = validateSpeckFileJSON(fname_in, fpath_in, processed_speck_id_list, logger)
        if speck_info is not None:
            speck_id = speck_info["speck_id"]
            speck_json = speck_info["speck_json"]
            speck_st = speck_info["start_time"]
            speck_et = speck_info["end_time"]
            s = computeSpeckStatistics(speck_json, speck_id, speck_st, speck_et, logger)
            if s is not None:
                data = np.vstack([data, s])
        logger.info("------------------------------------------------") 

    # Write device_statistics_table to a file
    logger.info("Create device statistics table at " + fpath_out)
    pd.DataFrame(data=data, columns=col_names).to_csv(fpath_out, index=False)

    logger.info("============== END creating device statistics table =================")
    logger.info("=====================================================================")

def computeSpeckStatistics(speck_json, speck_id, speck_st, speck_et, logger):
    logger.info("Processing Speck " + speck_id) 

    # Sanity check
    try:
        data = np.array(speck_json["data"], dtype=float)
    except:
        logger.error("Data type is not consistent for Speck " + speck_id)
        return None
    
    # Select the particle concentration data
    df_pm = pd.DataFrame(data=data[:, [0,1]], columns=["time", "pm"])

    # Select only valid data points (not NaN and larger than zero)
    df_pm_valid = df_pm.dropna(axis=0, how="any", subset=["pm"])
    df_pm_valid = df_pm_valid[(df_pm_valid["pm"] > 0) & (df_pm_valid["pm"] < 10000)]
    if len(df_pm_valid) == 0:
        logger.error("No valid data points for Speck " + speck_id)
        return None

    # Compute basic statistics
    #pm25_max = np.round(df_pm_valid["pm"].max());
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
        "avg_zscore": df_pm_groupby["zscore"].mean()}).reset_index(drop=True)
    df_peaks = df_peaks[df_peaks["peak"] == 1].reset_index(drop=True)
    df_peaks["duration"] = df_peaks["endTime"] - df_peaks["startTime"]

    # Compute average number of peaks per day
    num_days = (speck_et - speck_st) / 86400
    avg_num_of_peaks_per_day = float(len(df_peaks)) / num_days

    # Compute average peak duration
    avg_peak_duration_in_mins = df_peaks["duration"].mean() / 60

    # Compute average time between peaks
    avg_hours_between_peaks = df_peaks["startTime"].diff(1).dropna().mean() / 3600

    # Compute the average exposure per peak
    avg_exposure_per_peak = (df_peaks["duration"] * df_peaks["avg_zscore"]).mean()

    # Compute the average exposure per day
    avg_exposure_per_day = avg_exposure_per_peak * avg_num_of_peaks_per_day

    # Compute the baseline value (the 35th percentile)
    pm25_baseline = df_pm_valid["pm"].quantile(q=0.35)

    # Return a list of information for getting data from ESDR
    logger.info("Computed statistics of Speck " + speck_id)
    s = [pm25_baseline, avg_num_of_peaks_per_day,
        avg_exposure_per_day, avg_exposure_per_peak,
        avg_peak_duration_in_mins, avg_hours_between_peaks]
    s = np.around(s, 2).tolist()
    s.insert(0, speck_id)
    return s
