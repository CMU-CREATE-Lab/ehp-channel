# Environmental Health Channel
The [Environmental Health Channel](http://envhealthchannel.org/) is an interactive web-based platform for creating and sharing environmental sensing and health data narratives. This data, shared by affected residents and collected by the [Environmental Health Project](http://www.environmentalhealthproject.org/) (EHP), includes physical and psychosocial health symptoms, particulate pollution (PM2.5) air measurements, and personal stories from residents. This tool displays this data using visualization and exploratory data analysis techniques. This enables researchers, health professionals, and the public to interactively explore and share compelling scientific evidence of local impacts of oil and gas drilling.

# Usage
First, get a [Google Map JavaScript API key](https://developers.google.com/maps/documentation/javascript/get-api-key), and replace the api key in the folowing line in the /web/viz.html file.
```HTML
<script src="https://maps.googleapis.com/maps/api/js?key=[YOUR API KEY]"></script>
```

Then, download the ZCTA5 json file from [data.gov](https://catalog.data.gov/dataset/zip-codetabilation-area-boundaries/resource/ea476dcb-4846-4242-9fb3-d41afb13bf52). Then run the following bash commands in the terminal:
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

# Deployment
Here is an example of the apache config file (with https):
```bash
<VirtualHost *:443>
  ServerName envhealthchannel.org
  ServerAlias www.envhealthchannel.org
  SSLEngine on
  RewriteEngine On
  RewriteCond %{HTTP_HOST} !^envhealthchannel\.org [NC]
  RewriteCond %{HTTP_HOST} !^$
  RewriteRule ^/(.*)  http://envhealthchannel.org/$1 [L,R=301]
  Header set Cache-Control "max-age=0, must-revalidate"
  DocumentRoot /[YOUR_PATH]/envhealthchannel.org/www/web/
  <Directory "/[YOUR_PATH]/envhealthchannel.org">
    AddOutputFilterByType DEFLATE application/octet-stream
    AllowOverride None
    # Allow listing a directory that doesn't have index.html, and follow symlinks
    Options Indexes FollowSymLinks
    Order allow,deny
    Allow from all
  </Directory>
  SSLCertificateFile /etc/letsencrypt/live/envhealthchannel.org/cert.pem
  SSLCertificateKeyFile /etc/letsencrypt/live/envhealthchannel.org/privkey.pem
  Include /etc/letsencrypt/options-ssl-apache.conf
  SSLCertificateChainFile /etc/letsencrypt/live/envhealthchannel.org/chain.pem
</VirtualHost>

<VirtualHost *:80>
  ServerName envhealthchannel.org
  ServerAlias www.envhealthchannel.org
  RewriteEngine on
  RewriteRule ^ https://%{SERVER_NAME}%{REQUEST_URI} [L,NE,R=permanent]
</VirtualHost>
```
To periodically update the data on the channel, set a cron job:
```sh
crontab -e
```
Then add the following line to the crontab:
```sh
*/30 * * * * cd /[YOUR_PATH]/envhealthchannel.org/www/py; run-one python updateChannelData.py
```
