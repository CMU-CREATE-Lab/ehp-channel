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

    return

    # Read files
    log("Read health information: " + fpath_in[1], logger)
    df_h = pd.read_csv(fpath_in[1])

    # Clean up health code
    df_s["health code"] = df_s["health code"].str.strip(" ,")
    df_h["health code"] = df_h["health code"].str.strip(" ,")

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
    df_s["month"] = df_s["month"].map(month_to_season.get)

    # Merge year and month to a string
    df_s["season"] = df_s["month"].astype(str) + "_" + df_s["year"].astype(str)

    # Add the original all data back with season="all"
    df_s_tmp = deepcopy(df_s)
    df_s_tmp["season"] = "All"
    df_s = pd.concat([df_s, df_s_tmp], ignore_index=True)

    # Drop columns that are not used
    df_s = df_s.drop(["house name", "year", "month" ,"health code", "indoor"], axis=1)

    # Save speck data as a dictionary
    data_s_gp_season = df_s.groupby(["season"])
    print data_s_gp_season
    return

    # Save Speck data
    df_s2 = df_s.drop(["speck name", "health code","period", "zipcode"], axis=1, errors="ignore").groupby(["year", "month"])
    df_s.drop(["speck name", "zipcode", "health code", "year", "month", "period"], axis=1, errors="ignore").to_json(fpath_out[2], orient="records")
    data_s_gp_seasons = {}

    # Compute and save median of Speck analysis for each zipcode
    df_s_gp = df_s.drop(["speck name", "health code", "year", "month", "period"], axis=1, errors="ignore").groupby(["zipcode"])
    df_s_gp2 = df_s.drop(["speck name", "health code","period"], axis=1, errors="ignore").groupby(["zipcode", "year", "month"])
    print df_s_gp
    df_s_median = df_s_gp.median()
    df_s_median["size"] = df_s_gp.size()
    df_s_median = df_s_median[df_s_median["size"] >= 3] # sample size need > 3
    df_s_median.round(2).to_json(fpath_out[0], orient="columns")

    # Group and save Speck data by zipcode
    data_s_gp = {}
    for key, item in df_s_gp:
        data_s_gp[key] = json.loads(item.drop(["zipcode"], axis=1).to_json(orient="records"))
    saveJson(data_s_gp, fpath_out[4])

    # Compute percentage of having the symptom for each zipcode
    df_h_gp = df_h.drop(["health code", "year", "month"], axis=1, errors="ignore").groupby(["zipcode"])
    df_h_sum = df_h_gp.sum()
    df_h_size = df_h_gp.size()
    df_h_percent = df_h_sum.divide(df_h_size, axis=0)
    df_h_percent["size"] = df_h_size
    df_h_percent = df_h_percent[df_h_percent["size"] >= 3]  # sample size need > 3

    # Add percentage of having the symptom for entire dataset
    df_h_percent_all = df_h.sum().drop(["zipcode", "health code", "year", "month"], errors="ignore").divide(len(df_h))
    df_h_percent_all["size"] = len(df_h)
    df_h_percent_all.name = "all"
    df_h_percent = df_h_percent.append(df_h_percent_all)

    # Save health data
    df_h_percent = df_h_percent.round(2)
    df_h_percent.to_json(fpath_out[1], orient="columns")
    df_h_percent.to_json(fpath_out[3], orient="records")
    df_h_percent_gp = {}
    for idx, row in df_h_percent.iterrows():
        df_h_percent_gp[idx] = [json.loads(row.to_json(orient="columns"))]
    saveJson(df_h_percent_gp, fpath_out[5])


    #Save data aggregted for each time period
    data_s_gp_seasons = {}
    for key, item in df_s2:

        year = int(key[0])
        month = int(key[1])
        # if(df_s_gp.isnull().sum() == 0):

        season = season_dict[month]
        if (month == 1):
            year = year - 1

        if (year not in data_s_gp_seasons.keys()):
            data_s_gp_seasons[year] = {}

        if (season not in data_s_gp_seasons[year].keys()):
            data_s_gp_seasons[year][season] = {}

        data_s_gp_seasons[year][season] = json.loads(item.drop(["year", "month"], axis=1).to_json(orient="records"))


    # index = 4
    p_web = "../web/data/"
    for key in data_s_gp_seasons:
        for season in data_s_gp_seasons[key]:

            fpath_out.append(p_web + "speck_data_" + season + "_" + str(key) + ".json")
            saveJson(data_s_gp_seasons[key][season], fpath_out[-1])

    data_s_gp_seasons = {}

    time_periods = {}
    for key, item in df_s_gp2:

        zipcode = int(key[0])
        year = int(key[1])
        month = int(key[2])
        # if(df_s_gp.isnull().sum() == 0):

        season = season_dict[month]
        if (month == 1):
            year = year - 1

        if (year not in data_s_gp_seasons.keys()):
            data_s_gp_seasons[year] = {}

        if (season not in data_s_gp_seasons[year].keys()):
            data_s_gp_seasons[year][season] = {}

        data_s_gp_seasons[year][season][zipcode] = json.loads(
            item.drop(["zipcode", "year", "month"], axis=1).to_json(orient="records"))

        # index = 4
    p_web = "../web/data/"
    time_periods = {
        "spring": ['3', '4', '5'],
        "winter": ['12', '1', '2'],
        "summer": ['6', '7', '8'],
        "fall": ['9', '10', '11'],
    }
    time_ranges = []
    for year in data_s_gp_seasons:
        for season in data_s_gp_seasons[year]:

            time_ranges.append("_" + season + "_" + str(year))

            months = time_periods[season]
            queryString = 'year ==' + str(year) + '& (month == ' + months[0] + ' | month == ' + months[1] + ' | month == ' + months[2] + ')'
            if(season == "winter"):
                queryString = '(year == '+ str(year) + '& month == ' + months[0] + ') | (year == ' + str(year+1) + ' | month == ' + months[1] + ' | month == ' + \
                              months[2] + ')'

            df_s_gp_seasons = df_s.query(queryString).drop(["speck name", "health code", "period", "year", "month"], axis=1, errors="ignore").groupby(
                    ["zipcode"])
            df_s_median_season = df_s_gp_seasons.median()
            df_s_median_season["size"] = df_s_gp_seasons.size()
            # df_s_median = df_s_median[df_s_median["size"] >= 3]  # sample size need > 3
            fpath_out.append(p_web + "speck_median_aggr_by_zipcode_" + season + "_" + str(year) + ".json")
            df_s_median_season.round(2).to_json(fpath_out[-1], orient="columns")


            fpath_out.append(p_web + "speck_data_group_by_zipcode_" + season + "_" + str(year) + ".json")
            saveJson(data_s_gp_seasons[year][season], fpath_out[-1])
    fpath_out.append(p_web + "time_ranges.json")
    print(time_ranges)
    saveJson(time_ranges, fpath_out[-1])


# Process speck or health data
def processSpeckOrHealthData(fpath_in, fpath_out, logger, data_type="speck"):
    # Read data
    log("Read " + data_type + " information: " + fpath_in, logger)
    df = pd.read_csv(fpath_in)
    
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
            for k, df_k in df_key.drop(["season"], axis=1).groupby(["zipcode"]):
                if data_type == "speck":
                    d[k] = df_k.drop(["zipcode"], axis=1).round(2).to_dict(orient="records")
            data[key] = d
        # Save analysis data
        df_gp_zipcode = df_key.groupby(["zipcode"])
        if data_type == "speck":
            df_analysis = df_gp_zipcode.median()
        elif data_type == "health":
            df_analysis = df_gp_zipcode.sum().astype("float64").divide(df_gp_zipcode.size(), axis=0)
        df_analysis = df_analysis.round(2)
        df_analysis["size"] = df_gp_zipcode.size()
        df_analysis = df_analysis[df_analysis["size"] >= 3] # sample size need > 3
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
