import logging
from os import listdir
from os.path import isfile, join
import os
from datetime import datetime
from collections import defaultdict
from copy import deepcopy
import json
import requests
import uuid
import pytz

# Generate a logger for loggin files
def generateLogger(file_name, **options):
    log_level = options["log_level"] if "log_level" in options else logging.INFO
    if log_level == "debug": log_level = logging.DEBUG
    logging.basicConfig(filename=file_name, level=log_level, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    return logging.getLogger(__name__)

# Convert string to float in a safe way
def str2float(string):
    try:
        return float(string)
    except ValueError:
        return None

# Return a list of all files in a folder
def getAllFileNamesInFolder(file_path):
    return  [f for f in listdir(file_path) if isfile(join(file_path, f))]

# Return the root url for ESDR
def esdrRootUrl():
    return "https://esdr.cmucreatelab.org/"

# Return the root url for smell Pittsburgh
def smellPghRootUrl():
    return "http://api.smellpittsburgh.org/"

# Return the root url for smell Pittsburgh Staging
def smellPghStagingRootUrl():
    return "http://staging.api.smellpittsburgh.org/"

# Replace a non-breaking space to a normal space
def sanitizeUnicodeSpace(string):
    type_string = type(string)
    if string is not None and (type_string is str or type_string is unicode):
        return string.replace(u'\xa0', u' ')
    else:
        return None

# Convert a datetime object to epoch time
def datetimeToEpochtime(dt):
    if dt.tzinfo is None:
        dt_utc = dt
    else:
        dt_utc = dt.astimezone(pytz.utc).replace(tzinfo=None)
    epoch_utc = datetime.utcfromtimestamp(0)
    return int((dt_utc - epoch_utc).total_seconds() * 1000)

# Sum up two dictionaries
def dictSum(a, b):
    d = defaultdict(list, deepcopy(a))
    for key, val in b.items():
        d[key] += val
    return dict(d)

# Flip keys and values in a dictionary
def flipDict(a):
    d = defaultdict(list)
    for key, val in a.items():
        d[val] += [key]
    return dict(d)

# Check if a directory exists, if not, create it
def checkAndCreateDir(path):
    if not os.path.exists(os.path.dirname(path)):
        os.makedirs(os.path.dirname(path))

# Get the base name of a file path
def getBaseName(path, **options):
    with_extension = options["with_extension"] if "with_extension" in options else False
    do_strip = options["do_strip"] if "do_strip" in options else True
    base_name = os.path.basename(path)
    if with_extension:
        return base_name
    else:
        base_name_no_ext = os.path.splitext(base_name)[0]
        if do_strip:
            return base_name_no_ext.strip()
        else:
            return base_name_no_ext

# Remove all non-ascii characters in the string
def removeNonAsciiChars(str_in):
    if str_in is None:
        return "None"
    else:
        return str(unicode(str_in.encode("utf-8"), "ascii", "ignore"))

# Load json file
def loadJson(fpath):
    with open(fpath, "r") as f:
        return json.load(f)

# Save json file
def saveJson(content, fpath):
    with open(fpath, "w") as f:
        json.dump(content, f)

# Get the access token from ESDR
def getEsdrAccessToken(auth_json_path):
    logger = generateLogger("log.log")
    logger.info("Get access token from ESDR")
    auth_json = loadJson(auth_json_path)
    url = esdrRootUrl() + "oauth/token"
    headers = {"Authorization": "", "Content-Type": "application/json"}
    r = requests.post(url, data=json.dumps(auth_json), headers=headers)
    r_json = r.json()
    if r.status_code is not 200:
        logger.error("ESDR returns: " + json.dumps(r_json) + " when getting the access token")
        return None, None
    else:
        access_token = r_json["access_token"]
        user_id = r_json["userId"]
        logger.debug("ESDR returns: " + json.dumps(r_json) + " when getting the access token")
        logger.info("Receive access token " + access_token)
        logger.info("Receive user ID " + str(user_id))
        return access_token, user_id 

# Upload data to ESDR
# data_json = {
#   "channel_names": ["particle_concentration", "particle_count", "raw_particles", "temperature"],
#   "data": [[1449776044, 0.3, 8.0, 6.0, 2.3], [1449776104, 0.1, 3.0, 0.0, 4.9]]
# }
def uploadDataToEsdr(device_name, data_json, product_id, access_token, **options):
    logger = generateLogger("log.log")

    # Set the header for http request
    headers = {
        "Authorization": "Bearer " + access_token,
        "Content-Type": "application/json"
    }
   
    # Check if the device exists
    logger.info("Try getting the device ID of device name '" + device_name + "'")
    url = esdrRootUrl() + "api/v1/devices?where=name=" + device_name + ",productId=" + str(product_id)
    r = requests.get(url, headers=headers)
    r_json = r.json()
    device_id = None
    if r.status_code is not 200:
        logger.error("ESDR returns: " + json.dumps(r_json) + " when getting the device ID for '" + device_name + "'")
    else:
        logger.debug("ESDR returns: " + json.dumps(r_json) + " when getting the device ID for '" + device_name + "'")
        if r_json["data"]["totalCount"] < 1:
            logger.error("'" + device_name + "' did not exist")
        else:
            device_id = r_json["data"]["rows"][0]["id"]
            logger.info("Receive existing device ID " + str(device_id))

    # Create a device if it does not exist
    if device_id is None:
        logger.info("Create a device for '" + device_name + "'")
        url = esdrRootUrl() + "api/v1/products/" + str(product_id) + "/devices"
        device_json = {
            "name": device_name,
            "serialNumber": options["serialNumber"] if "serialNumber" in options else str(uuid.uuid4())
        }
        r = requests.post(url, data=json.dumps(device_json), headers=headers)
        r_json = r.json()
        if r.status_code is not 201:
            logger.error("ESDR returns: " + json.dumps(r_json) + " when creating a device for '" + device_name + "'")
            return None
        else:
            logger.debug("ESDR returns: " + json.dumps(r_json) + " when creating a device for '" + device_name + "'")
            device_id = r_json["data"]["id"]
            logger.info("Create new device ID " + str(device_id))

    # Check if a feed exists for the device
    logger.info("Get feed ID for '" + device_name + "'")
    url = esdrRootUrl() + "api/v1/feeds?where=deviceId=" + str(device_id)
    r = requests.get(url, headers=headers)
    r_json = r.json()
    feed_id = None
    api_key = None
    api_key_read_only = None
    if r.status_code is not 200:
        logger.debug("ESDR returns: " + json.dumps(r_json) + " when getting the feed ID")
    else:
        logger.debug("ESDR returns: " + json.dumps(r_json) + " when getting the feed ID")
        if r_json["data"]["totalCount"] < 1:
            logger.info("No feed ID exists for device " + str(device_id))
        else:
            row = r_json["data"]["rows"][0]
            feed_id = row["id"]
            api_key = row["apiKey"]
            api_key_read_only = row["apiKeyReadOnly"]
            logger.info("Receive existing feed ID " + str(feed_id))

    # Create a feed if no feed ID exists
    if feed_id is None:
        logger.info("Create a feed for '" + device_name + "'")
        url = esdrRootUrl() + "api/v1/devices/" + str(device_id) + "/feeds"
        feed_json = {
            "name": device_name,
            "exposure": options["exposure"] if "exposure" in options else "virtual",
            "isPublic": options["isPublic"] if "isPublic" in options else 0,
            "isMobile": options["isMobile"] if "isMobile" in options else 0,
            "latitude": options["latitude"] if "latitude" in options else None,
            "longitude": options["longitude"] if "longitude" in options else None
        }
        r = requests.post(url, data=json.dumps(feed_json), headers=headers)
        r_json = r.json()
        if r.status_code is not 201:
            logger.error("ESDR returns: " + json.dumps(r_json) + " when creating a feed")
            return None
        else:
            logger.info("ESDR returns: " + json.dumps(r_json) + " when creating a feed")
            feed_id = r_json["data"]["id"]
            api_key = r_json["data"]["apiKey"]
            api_key_read_only = r_json["data"]["apiKeyReadOnly"]
            logger.info("Create new feed ID " + str(feed_id))
    
    # Upload Speck data to ESDR
    logger.info("Upload sensor data for '" + device_name + "'")
    url = esdrRootUrl() + "api/v1/feeds/" + str(feed_id)
    r = requests.put(url, data=json.dumps(data_json), headers=headers)
    r_json = r.json()
    if r.status_code is not 200:
        logger.error("ESDR returns: " + json.dumps(r_json) + " when uploading data")
        return None
    else:
        logger.debug("ESDR returns: " + json.dumps(r_json) + " when uploading data")

    # Return a list of information for getting data from ESDR
    logger.info("Data uploaded")
    return [device_id, feed_id, api_key, api_key_read_only]
