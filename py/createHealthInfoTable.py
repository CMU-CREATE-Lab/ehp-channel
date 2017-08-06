import pandas as pd
from util import *

# Build the health information table
def createHealthInfoTable(fpath_in, fpath_out):
    logger = generateLogger("log.log")
    logger.info("=====================================================================")
    logger.info("=============== START creating health info table ====================")

    # Read health file provided by EHP
    logger.info("Read the health data " + fpath_in)
    df = pd.read_excel(fpath_in, sheet=0)

    # Delete and rename columns
    del df["MCF"]
    del df["MCF lov/high"]
    df.rename(columns={"zip code/mcf": "zipcode", "LW CASE ID": "health code"}, inplace=True)
    df.columns = df.columns.str.strip()

    # Delete the last two rows because they are summaries
    df.drop(df.index[-2:], inplace=True)

    # Clean up data
    df["health code"] = df["health code"].astype(str).str.strip(", ")

    # Select columns
    selected = ["health code", "zipcode",
        "sleep disruption", "stress/anxiety", "irritable moody",
        "irritation", "sinus", "nose bleeds",
        "head ache", "dizziness", "numbness", "memory short term",
        "cough", "wheezing",
        "rash", "Itch", "lesions blisters", "burning"]
    df = df[selected]
    
    # Save file
    df.to_csv(fpath_out, index=False)

    logger.info("================= END creating health info table ====================")
    logger.info("=====================================================================")
