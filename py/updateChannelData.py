import sys
from processData import *
from createZipcodeGeoJson import *
from createZipcodeBoundInfo import *

# This file is for updating the data on the environmental health channel periodically
def main(argv):
    p = "../data/"
    p_web = "../web/data/"

    # Process data
    # Generate files for visualization, fpath_in=[speck, health, story]
    fpath_in = [
        "https://docs.google.com/spreadsheets/d/18ZLEySsLWU2ICRWqhlolfuI9MCiADEtvv-7W7pefLZU/export?format=csv&id=18ZLEySsLWU2ICRWqhlolfuI9MCiADEtvv-7W7pefLZU&gid=0",
        "https://docs.google.com/spreadsheets/d/18ZLEySsLWU2ICRWqhlolfuI9MCiADEtvv-7W7pefLZU/export?format=csv&id=18ZLEySsLWU2ICRWqhlolfuI9MCiADEtvv-7W7pefLZU&gid=1153620501",
        "https://docs.google.com/spreadsheets/d/18ZLEySsLWU2ICRWqhlolfuI9MCiADEtvv-7W7pefLZU/export?format=csv&id=18ZLEySsLWU2ICRWqhlolfuI9MCiADEtvv-7W7pefLZU&gid=2061228022"
    ] # these sheets are from my public folder in google drive
    # fpath_in = [
    #     "https://docs.google.com/spreadsheets/d/1ugZuLyTQoSVeeY6RtpwpSY5tpzh1r3snZ8eoyBY8bcc/export?format=csv&id=1ugZuLyTQoSVeeY6RtpwpSY5tpzh1r3snZ8eoyBY8bcc&gid=1789860770",
    #     "https://docs.google.com/spreadsheets/d/1ugZuLyTQoSVeeY6RtpwpSY5tpzh1r3snZ8eoyBY8bcc/export?format=csv&id=1ugZuLyTQoSVeeY6RtpwpSY5tpzh1r3snZ8eoyBY8bcc&gid=745601240",
    #     "https://docs.google.com/spreadsheets/d/1ugZuLyTQoSVeeY6RtpwpSY5tpzh1r3snZ8eoyBY8bcc/export?format=csv&id=1ugZuLyTQoSVeeY6RtpwpSY5tpzh1r3snZ8eoyBY8bcc&gid=26641984"
    # ] # these sheets are from EHP's google drive
    fpath_out = [
        p_web + "speck_median_aggr_by_zipcode.json",
        p_web + "health_percent_aggr_by_zipcode.json",
        p_web + "speck_data.json",
        p_web + "health_data.json",
        p_web + "speck_data_group_by_zipcode.json",
        p_web + "health_data_group_by_zipcode.json",
        p_web + "story_data.json"

    ]
    processData(fpath_in, fpath_out)

    # Read the GeoJSON containing all US zipcode boundaries
    # Read the table that maps Speck ID and zipcode
    # Then output a GeoJSON containing only the zipcode boundaries which have Specks
    fpath_in = [
        p_web+"speck_data_group_by_zipcode.json",
        p_web+"health_data_group_by_zipcode.json",
        p+"geo/zcta5.json"
    ]
    fpath_out = p_web+"zipcode_bound_geoJson.json"
    createZipcodeGeoJson(fpath_in, fpath_out)

    # Read the GeoJSON zipcode boundaries which have Specks
    # Then output a table that maps zipcode, bound, and center location
    fpath_in = p_web+"zipcode_bound_geoJson.json"
    fpath_out = p_web+"zipcode_bound_info.json"
    createZipcodeBoundInfo(fpath_in, fpath_out)

if __name__ == "__main__":
    main(sys.argv)
