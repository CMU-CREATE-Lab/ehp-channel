import openpyxl as PX
import json as JSON
from geopy.distance import vincenty as VIN

# This function reads the compressor station data
# , selects stations that are near the locations in EHP data
# , and saves the file as data/private/comps.json
def genCompStations(input_file_name):
    # Read compressor station file
    print "----------------------------------------------"
    print "----- Generate compressor stations table -----"
    print "Read compressor station files"
    w = PX.load_workbook("data/private/" + input_file_name)
    p = w.worksheets[0]

    # Read the user and lat lng table
    print "Read the user and lat lng table..."
    file_name = "data/private/user_latlng_table.json"
    with open(file_name) as data_file:
        usr_latlng_tab = JSON.load(data_file)

    # Compute Vincenty distance and select the stations
    # that are at most 3 miles away from a house in EHP data
    print "Compute Vincenty distance and select the stations..."
    print "Totally " + str(len(p.rows)) + " rows..."
    comps = {}
    thr = 3 # miles
    for row in p.rows:
        is_geocoded = row[28].value
        status = str(row[20].value)
        if (is_geocoded is not None) and ("Issued" in status):
            lat = float(row[21].value)
            lng = float(row[22].value)
            comps_latlng = (lat, lng)
            for key in usr_latlng_tab:
                usr_latlng = tuple(usr_latlng_tab[key])
                dist = VIN(comps_latlng, usr_latlng).miles
                if dist <= thr:
                    site_id = str(row[5].value)
                    info = {"latlng": [lat, lng]}
                    comps[site_id] = info

    # Save the selected wells in data/private
    file_name = "data/private/comps.json"
    with open(file_name, "w") as out_file:
        JSON.dump(comps, out_file)
    if log_level == 1:
    print "Selected compressor stations created in " + file_name
