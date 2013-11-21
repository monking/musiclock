#!/bin/bash
audio_dir=`dirname $0`/../audio

read -p "what group does the server run under? (www-data) " server_grp

if [ -z "$server_grp" ]; then
  server_grp=www-data
fi

sudo chgrp -R $server_grp $audio_dir
sudo chmod -R g+rX $audio_dir
