import csv as CSV
import json as JSON
from geopy.distance import vincenty as VIN

# This function reads the oil and gas wells data
# , selects wells that are active and near the locations in EHP data
# , and saves the file as data/private/wells.json
def genWells(input_file_name):
    # Read well files and select state PA, WV, OH, and NY
    print '--------------------------------------------'
    print '----- Generate oil and gas wells table -----'
    print 'Read well files and select state PA, WV, OH, and NY...'
    path_name = 'data/private/' + input_file_name
    wells = []
    with open(path_name, 'rb') as csv_file:
        wells_i = CSV.reader(csv_file)
        for row in wells_i:
            s = row[0]
            if s == 'PA' or s == 'WV' or s == 'OH' or s == 'NY':
                wells.append(row)

    # Read the user and lat lng table
    print 'Read the user and lat lng table...'
    file_name = 'data/private/user_latlng_table.json'
    with open(file_name) as data_file:
        usr_latlng_tab = JSON.load(data_file)

    # Compute Vincenty distance and select the wells
    # that are at most 3 miles away from a house in EHP data
    # and the status is active
    print 'Compute Vincenty distance and select the wells...'
    print 'Totally ' + str(len(wells)) + ' rows...'
    wells_selected = {}
    thr = 3 # miles
    for i in range(0, len(wells)):
        well_i = wells[i]
        status = str(well_i[4])
        if 'Active' not in status:
            continue
        well_i_latlng = (well_i[8], well_i[7])
        for key in usr_latlng_tab:
            usr_latlng = tuple(usr_latlng_tab[key])
            dist = VIN(well_i_latlng, usr_latlng).miles
            if dist <= thr:
                api = str(well_i[9]).replace('\xa0', ' ').strip()
                info = { \
                    'latlng': [float(well_i[8]), float(well_i[7])], \
                    'status': str(well_i[4]).replace('\xa0', ' ').strip(), \
                    'type': str(well_i[3]).replace('\xa0', ' ').strip() \
                }
                wells_selected[api] = info
                break
        if i % 3000 == 0:
            print 'Processed ' + str(i) + ' rows...'

    # Save the selected wells in data/private
    file_name = 'data/private/wells.json'
    with open(file_name, 'w') as out_file:
        JSON.dump(wells_selected, out_file)
    if log_level == 1:
    print 'Selected oil and gas wells created in ' + file_name
