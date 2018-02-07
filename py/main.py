import sys
from formatAllSpeckData import *
from uploadAllSpeckData import *
from simplifyOldUserInfo import *
from speckNameToHealthId import *
from createDeviceInfoTable import *
from mergeDeviceInfoTable import *
from createHealthInfoTable import *

from processData import *
from createZipcodeGeoJson import *
from createZipcodeBoundInfo import *

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
    
    # Create a table that maps health case ID and Speck name for new data
    fpath_in = p+"speck/2/json/"
    fpath_out = p+"health/speck_name_to_health_id_new.csv"
    #speckNameToHealthId(fpath_in, fpath_out)

    # Build the device information table
    fpath_in_old = [p+"speck/1/json/", p+"ehp/info_old.csv", p+"health/speck_name_to_health_id_old.csv"]
    fpath_in_new = [p+"speck/2/json/", p+"ehp/info_new.csv", p+"health/speck_name_to_health_id_new.csv"]
    fpath_out_old = p+"result/speck_old.csv"
    fpath_out_new = p+"result/speck_new.csv"
    #createDeviceInfoTable(fpath_in_old, fpath_out_old, "old")
    #createDeviceInfoTable(fpath_in_new, fpath_out_new, "new")

    # Merge device tables
    fpath_in = [p+"ehp/index_calculator.csv", p+"ehp/speck_name_to_zipcode.csv"]
    fpath_out = p+"result/speck.csv"
    #mergeDeviceInfoTable(fpath_in, fpath_out)

    # Build the health information table
    fpath_in = p+"health/health.xlsx"
    fpath_out = p+"result/health.csv"
    #createHealthInfoTable(fpath_in, fpath_out)

    ############################################################################################
    #### All the above code is for uploading Speck data and creating tables on Google sheet ####
    ############################################################################################

    # Process data
    # Generate files for visualization
    #fpath_in = [
    #    "https://docs.google.com/spreadsheets/d/18ZLEySsLWU2ICRWqhlolfuI9MCiADEtvv-7W7pefLZU/export?format=csv&id=18ZLEySsLWU2ICRWqhlolfuI9MCiADEtvv-7W7pefLZU&gid=0",
    #    "https://docs.google.com/spreadsheets/d/18ZLEySsLWU2ICRWqhlolfuI9MCiADEtvv-7W7pefLZU/export?format=csv&id=18ZLEySsLWU2ICRWqhlolfuI9MCiADEtvv-7W7pefLZU&gid=1153620501",
    #    "https://docs.google.com/spreadsheets/d/18ZLEySsLWU2ICRWqhlolfuI9MCiADEtvv-7W7pefLZU/export?format=csv&id=18ZLEySsLWU2ICRWqhlolfuI9MCiADEtvv-7W7pefLZU&gid=2061228022"
    #] # these google sheets are from my public folder in google drive
    fpath_in = [
        "https://docs.google.com/spreadsheets/d/1ugZuLyTQoSVeeY6RtpwpSY5tpzh1r3snZ8eoyBY8bcc/export?format=csv&id=1ugZuLyTQoSVeeY6RtpwpSY5tpzh1r3snZ8eoyBY8bcc&gid=1789860770",
        "https://docs.google.com/spreadsheets/d/1ugZuLyTQoSVeeY6RtpwpSY5tpzh1r3snZ8eoyBY8bcc/export?format=csv&id=1ugZuLyTQoSVeeY6RtpwpSY5tpzh1r3snZ8eoyBY8bcc&gid=745601240",
        "https://docs.google.com/spreadsheets/d/1ugZuLyTQoSVeeY6RtpwpSY5tpzh1r3snZ8eoyBY8bcc/export?format=csv&id=1ugZuLyTQoSVeeY6RtpwpSY5tpzh1r3snZ8eoyBY8bcc&gid=26641984"
    ] # these google sheets are from EHP's google drive     
    fpath_out = [
        p+"result/speck_median_aggr_by_zipcode.json",
        p+"result/health_percent_aggr_by_zipcode.json",
        p+"result/speck_data.json",
        p+"result/health_data.json",
        p+"result/speck_data_group_by_zipcode.json",
        p+"result/health_data_group_by_zipcode.json",
        p+"result/story_data.json"
    ]
    processData(fpath_in, fpath_out)

    # Read the GeoJSON containing all US zipcode boundaries
    # Read the table that maps Speck ID and zipcode
    # Then output a GeoJSON containing only the zipcode boundaries which have Specks
    fpath_in = [
        p+"result/speck_data_group_by_zipcode.json",
        p+"result/health_data_group_by_zipcode.json",
        p+"geo/zcta5.json"
    ]
    fpath_out = p+"result/zipcode_bound_geoJson.json"
    #createZipcodeGeoJson(fpath_in, fpath_out)

    # Read the GeoJSON zipcode boundaries which have Specks
    # Then output a table that maps zipcode, bound, and center location
    fpath_in = p+"result/zipcode_bound_geoJson.json"
    fpath_out = p+"result/zipcode_bound_info.json"
    #createZipcodeBoundInfo(fpath_in, fpath_out)

if __name__ == "__main__":
    main(sys.argv)
