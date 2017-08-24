import pandas as pd

# Merge the device information tables
def mergeDeviceInfoTable(fpath_in, fpath_out):
    df_s = pd.read_csv(fpath_in[0])
    df_z = pd.read_csv(fpath_in[1])
    
    df = df_s.merge(df_z, left_on="speck name", right_on="speck name", how='inner')
    df.to_csv(fpath_out, index=False)
