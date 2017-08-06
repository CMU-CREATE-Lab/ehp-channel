import sys
from formatAllSpeckData import *
from uploadAllSpeckData import *
from simplifyOldUserInfo import *
from createDeviceInfoTable import *
from createZipcodeDeviceTable import *
from createZipcodeGeoJson import *
from createZipcodeBoundInfo import *
from createDeviceStatisticsTable import *
from createHealthDataRelatedTables import *
from speckIdToHealthId import *
from mergeDeivceAndHealthData import *

def main(argv):
    p = "../data/"
    
    # Read all raw Speck data and process them into json files for ESDR
    # The data batches contains old and new naming formats
    fpath_in = [p+"speck/1/raw/", p+"speck/2/raw/"]
    fpath_out_1 = [p+"speck/1/json/", p+"speck/1/"]
    fpath_out_2 = [p+"speck/2/json/", p+"speck/2/"]
    #formatAllSpeckData(fpath_in[0], fpath_out_1)
    #formatAllSpeckData(fpath_in[1], fpath_out_2)

    # Upload the processed json files to ESDR
    fpath_in_old = [p+"esdr/auth.json", p+"speck/1/json/"]
    fpath_in_new = [p+"esdr/auth.json", p+"speck/2/json/"]
    #uploadAllSpeckData(fpath_in_old)
    #uploadAllSpeckData(fpath_in_new)

    # [info_old.csv is already edited, running this part of code will override the file]
    # Read the old user information that EHP provides
    # Then simplify the table to Speck number, zipcode, and device given time
    fpath_in = p+"ehp/user.xlsx"
    fpath_out = p+"ehp/info_old.csv"
    #simplifyOldUserInfo(fpath_in, fpath_out)
    
    # Create a table that maps health case ID and Speck ID for new data
    fpath_in = p+"speck/2/json/"
    fpath_out = p+"health/speck_id_to_health_id_new.csv"
    #speckIdToHealthId(fpath_in, fpath_out)

    # Build the device information table
    fpath_in_old = [p+"speck/1/json/", p+"ehp/info_old.csv", p+"health/speck_id_to_health_id_old.csv"]
    fpath_in_new = [p+"speck/2/json/", p+"ehp/info_new.csv", p+"health/speck_id_to_health_id_new.csv"]
    fpath_out_old = p+"result/device_old.csv"
    fpath_out_new = p+"result/device_new.csv"
    #createDeviceInfoTable(fpath_in_old, fpath_out_old, "old")
    #createDeviceInfoTable(fpath_in_new, fpath_out_new, "new")

    ############################################################################################
    #### All the above code is for uploading Speck data and creating tables on Google sheet ####
    ############################################################################################

    # Read information files (maps Speck number, house ID, or health ID to zipcode) and the device feed table
    # Then output a machine readable file that maps zipcode and device ID
    fpath_in = [p+"result/device_feed_table.json", p+"ehp/info_old.csv", p+"ehp/info_new.xlsx"]
    fpath_out = p+"result/zipcode_device_table.json"
    #createZipcodeDeviceTable(fpath_in, fpath_out)
    
    # Read the processed JSON files and compute statistics
    # Then output a table that maps Speck ID and statistics
    fpath_in_old = p+"speck/1/json/"
    fpath_in_new = p+"speck/2/json/"
    fpath_out = p+"result/device_statistics_table.csv"
    #createDeviceStatisticsTable(fpath_in_old, fpath_out)
    #createDeviceStatisticsTable(fpath_in_new, fpath_out)

    # Read the health data
    # Then output two tables: (1) zipcode to health case ID, (2) health case ID to health statistics
    fpath_in = p+"health/health.xlsx"
    fpath_out = [p+"result/zipcode_health_table.json", p+"result/health_statistics_table.csv"]
    #createHealthDataRelatedTables(fpath_in, fpath_out)

    # Merge zipcode device table and zipcode health table
    # Merge device statistics table and health statistics table
    fpath_in = [
        p+"result/zipcode_device_table.json",
        p+"result/zipcode_health_table.json",
        p+"result/device_statistics_table.csv",
        p+"result/health_statistics_table.csv",
        p+"health/speck_id_to_health_id.csv"
    ]
    fpath_out = ["result/zipcode_device_health_table.json", "result/device_health_statistics_table.csv"]
    #mergeDeivceAndHealthData(fpath_in, fpath_out)

    # Read the GeoJSON containing all US zipcode boundaries
    # Read the table that maps Speck ID and zipcode
    # Then output a GeoJSON containing only the zipcode boundaries which have Specks
    fpath_in = [p+"result/zipcode_device_table.json", p+"geo/zcta5.json"]
    fpath_out = p+"result/zipcode_bound_geoJson.json"
    #createZipcodeGeoJson(fpath_in, fpath_out)

    # Read the GeoJSON zipcode boundaries which have Specks
    # Then output a table that maps zipcode, bound, and center location
    fpath_in = p+"result/zipcode_bound_geoJson.json"
    fpath_out = p+"result/zipcode_bound_info.json"
    #createZipcodeBoundInfo(fpath_in, fpath_out)

if __name__ == "__main__":
    main(sys.argv)
