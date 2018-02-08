# Environmental Health Channel
The [Environmental Health Channel](http://envhealthchannel.org/) is an interactive web-based platform for creating and sharing environmental sensing and health data narratives. This data, shared by affected residents and collected by the [Environmental Health Project](http://www.environmentalhealthproject.org/) (EHP), includes physical and psychosocial health symptoms, particulate pollution (PM2.5) air measurements, and personal stories from residents. This tool displays this data using visualization and exploratory data analysis techniques. This enables researchers, health professionals, and the public to interactively explore and share compelling scientific evidence of local impacts of oil and gas drilling.

# Usage
First, download the ZCTA5 json file from [data.gov](https://catalog.data.gov/dataset/zip-codetabilation-area-boundaries/resource/ea476dcb-4846-4242-9fb3-d41afb13bf52). Then run the following bash commands in the terminal:
```bash
cd [path of the ehp-channel folder]
mkdir data
cd data/
mkdir geo
cd geo/
mv [path of the ZCTA5 json file] .
mv [the ZCTA5 json file] zcta5.json
cd ../../py/
python updateChannelData.py
```
This will create a "data" folder in the "web" folder for the website. When running the python command, you will need to install all dependencies, see the libraries that I imported in the "util.py" file. Because the "util.py" file is shared with other projects, there are some libraries that are not used in this project. However, to run the code, please install all of them.
