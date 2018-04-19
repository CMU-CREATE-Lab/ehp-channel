from util import *
import pandas as pd
import json
from copy import deepcopy

# Process all data provided by EHP to json files
def processData(fpath_in, fpath_out):
    logger = generateLogger("log.log")
    log("=====================================================================", logger)
    log("====================== START processing data ========================", logger)
    
    # Check output directories
    for p in fpath_out:
        checkAndCreateDir(p)
    
    processSpeckOrHealthData(fpath_in[0], fpath_out, logger, data_type="speck")
    processSpeckOrHealthData(fpath_in[1], fpath_out, logger, data_type="health")
    processStory(fpath_in[2], fpath_out, logger)

    log("======================== END processing data ========================", logger)
    log("=====================================================================", logger)

# Process speck or health data
def processSpeckOrHealthData(fpath_in, fpath_out, logger, data_type="speck"):
    # Read data
    log("Read " + data_type + " information: " + fpath_in, logger)
    df = pd.read_csv(fpath_in)

    # Make sure that month and year are integers
    df["month"] = df["month"].fillna(-1).astype("int64")
    df["year"] = df["year"].fillna(-1).astype("int64")
    
    # Map of season and month
    month_to_season = {
        1: "Winter",
        2: "Winter",
        3: "Spring",
        4: "Spring",
        5: "Spring",
        6: "Summer",
        7: "Summer",
        8: "Summer",
        9: "Fall",
        10: "Fall",
        11: "Fall",
        12: "Winter"}

    # Replace month to season
    df["month"] = df["month"].map(month_to_season.get)

    # Merge year and month to a string
    df["season"] = df["month"].astype(str) + "_" + df["year"].astype(str)

    # Add the original all data back with season="all"
    df_tmp = deepcopy(df)
    df_tmp["season"] = "All"
    df = pd.concat([df, df_tmp], ignore_index=True)
    
    # Drop nan
    idx = ((df["month"]==-1)|(df["year"]==-1))&(df["season"]!="All")
    df = df[~idx]

    # Drop columns that are not used
    df = df.drop(["house name", "year", "month" ,"health code", "indoor"], axis=1, errors="ignore")

    # Group data by season
    df_gp_season = df.groupby(["season"])
    
    # Save data for each season
    data = {}
    analysis = {}
    for key, df_key in df_gp_season:
        df_key_tmp = deepcopy(df_key)
        df_key_tmp["zipcode"] = "All"
        df_key = pd.concat([df_key, df_key_tmp], ignore_index=True)
        # Save speck data
        if data_type == "speck":
            d = {}
            df_key_gp = df_key.drop(["season"], axis=1).groupby(["zipcode"])
            for k, df_k in df_key_gp:
                if len(df_k) < 3: continue # we want sample size > 3
                d[k] = df_k.drop(["zipcode"], axis=1).round(2).to_dict(orient="records")
            if len(d.keys()) > 0: data[key] = d
        # Save analysis data
        df_gp_zipcode = df_key.groupby(["zipcode"])
        if data_type == "speck":
            df_analysis = df_gp_zipcode.median()
        elif data_type == "health":
            df_analysis = df_gp_zipcode.sum().astype("float64").divide(df_gp_zipcode.size(), axis=0)
        df_analysis = df_analysis.round(2)
        df_analysis["size"] = df_gp_zipcode.size()
        df_analysis = df_analysis[df_analysis["size"] >= 3] # sample size need > 3
        if len(df_analysis) <= 1: continue
        analysis[key] = df_analysis.round(2).to_dict(orient="dict")
        # Save health data
        if data_type == "health":
            d = {}
            all_d = []
            for idx, row in df_analysis.iterrows():
                d[idx] = [row.to_dict()]
                all_d.append(d[idx][0])
            d["All"] = all_d
            data[key] = d
    saveJson(data, fpath_out + data_type + "_data.json")
    saveJson(analysis, fpath_out + data_type + "_analysis.json")

# Process and save story information
def processStory(fpath_in, fpath_out, logger):
    # Read story data
    log("Read story information: " + fpath_in, logger)
    df_st = pd.read_csv(fpath_in)

    # Process story data
    data_st = []
    df_st_gp = df_st.groupby(["story id"])
    for key, item in df_st_gp:
        story = {
            "latitude": None,
            "longitude": None,
            "title": None,
            "slide": []
        }
        for idx, row in item.iterrows():
            ct = row["content type"]
            if ct == "slide":
                story["slide"].append({
                    "image": row.get("source1"),
                    "text": row.get("source2")
                })
            elif ct == "latitude":
                story["latitude"] = str2float(row.get("source1"))
            elif ct == "longitude":
                story["longitude"] = str2float(row.get("source1"))
            elif ct == "title":
                story["title"] = row.get("source1")
        data_st.append(story)

    # Save story data
    fpath_out += "story_data.json"
    log("Story information saved: " + fpath_out, logger)
    saveJson(data_st, fpath_out)
