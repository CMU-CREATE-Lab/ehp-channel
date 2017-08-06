from util import *
import pandas as pd
import json

# Merge zipcode device table and zipcode health table
# Merge device statistics table and health statistics table
def mergeDeivceAndHealthData(fpath_in, fpath_out):
    logger = generateLogger("log.log")
    logger.info("=====================================================================")
    logger.info("=============== START merging device and health data ================")

    # Read files
    logger.info("Read Speck information: " + fpath_in[0])
    df_s = pd.read_csv(fpath_in[0])
    logger.info("Read health information: " + fpath_in[1])
    df_h = pd.read_csv(fpath_in[1])

    # Clean up health code
    df_s["health code"] = df_s["health code"].str.strip(" ,")
    df_h["health code"] = df_h["health code"].str.strip(" ,")

    # Save Speck data
    df_s.drop(["speck name", "zipcode", "health code"], axis=1).to_json(fpath_out[2], orient="records")

    # Compute and save median of Speck analysis for each zipcode
    df_s_gp = df_s.groupby(["zipcode"])
    df_s_median = df_s_gp.median()
    df_s_median["size"] = df_s_gp.size()
    df_s_median = df_s_median[df_s_median["size"] >= 3] # smaple size need > 3
    df_s_median.round(2).to_json(fpath_out[0], orient="columns")

    # Group and save Speck data by zipcode
    data_s_gp = {}
    for key, item in df_s_gp:
        data_s_gp[key] = json.loads(item.drop(["zipcode", "health code"], axis=1).to_json(orient="records"))
    saveJson(data_s_gp, fpath_out[4])

    # Compute percentage of having the symptom for each zipcode
    df_h_gp = df_h.groupby(["zipcode"])
    df_h_sum = df_h_gp.sum()
    df_h_size = df_h_gp.size()
    df_h_percent = df_h_sum.divide(df_h_size, axis=0)
    df_h_percent["size"] = df_h_size
    df_h_percent = df_h_percent[df_h_percent["size"] >= 3] # sample size need > 3
    
    # Add percentage of having the symptom for entire dataset
    df_h_percent_all = df_h.sum().drop(["zipcode", "health code"]).divide(len(df_h))
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

    # Compute and save histogram of data
    #saveJson(formatHistogram(df_h), fpath_out[3])

    # Group and save the histogram of data by zipcode
    #data_h_gp = {}
    #for key, item in df_h_gp:
    #    data_h_gp[key] = formatHistogram(item)
    #saveJson(data_h_gp, fpath_out[5])

    # Merge two data frames
    #data = []
    #df_h = df_h.set_index(["health code"]).drop("zipcode", axis=1)
    #df_s.apply(lambda row: expandSpeckTableByHealthCode(row, data, df_h), axis=1)
    #df = pd.DataFrame(data=data, columns=df_s.columns.tolist()+df_h.columns.tolist())
    #df.drop(["speck name", "zipcode", "health code"], axis=1).to_json(fpath_out[2], orient="records")

    logger.info("=============== START merging device and health data ================")
    logger.info("=====================================================================")

def formatHistogram(df):
    hist = df.drop(["zipcode", "health code"], axis=1).apply(histogram, axis=0).fillna(0).astype(int)
    return json.loads(hist.to_json(orient="split")) 

def histogram(col):
    row = {}
    for idx, val in col.value_counts().iteritems():
        row[idx] = val
    return pd.Series(row)

def expandSpeckTableByHealthCode(row, data, df_h):
    h_id_str = row["health code"]
    if not pd.isnull(h_id_str):
        for h_id in h_id_str.split(","):
            if h_id == "": continue
            row_cp = row.copy(deep=True)
            row_cp["health code"] = h_id
            if h_id in df_h.index:
                data.append(row_cp.values.tolist() + df_h.loc[h_id].values.tolist())
            else:
                data.append(row_cp.values.tolist())
    else:
        data.append(row.values.tolist())
