---
title: 'Raspberry PI + Raspbian + Squeezeslave'
pubDate: 'Jul 11 2013'
tags: ['DIY', 'Technology']
---

I am not going to waste too many words this time, instead I am just posting the commands required to get squeezeslave run as deamon on a Raspbian Raspberry Pi.

1.  Download and untar latest Squeezslave for your Raspberry from https://code.google.com/p/squeezeslave/. As of today this can be done via

    ```bash
    wget https://squeezeslave.googlecode.com/files/squeezeslave-1.3-390-armhf-lnx32.tar.gz
    tar -zxvf squeezeslave-1.3-390-armhf-lnx32.tar.gz
    ```

2.  Move everything into the right places

    ```bash
    sudo mkdir /usr/local/squeezeslave
    sudo mv squeezeslave /usr/local/squeezeslave
    sudo chown root:root /usr/local/squeezeslave/squeezeslave
    sudo ln -s /usr/local/squeezeslave/squeezeslave /usr/local/bin/squeezeslave
    ```

    
    From here on you should already be able to run squeezeslave via
    
    ```bash
    squeezeslave -o 0 YOURSERVER
    ```

3.  To run squeezeslave as a deamon and at the system start you'll need to add [this file](/files/legacy/media/squeezeslave) and get it to the right place.

    ```bash
    wget https://blog.chschmid.com/media/squeezeslave
    sudo mv squeezeslave /etc/init.d
    sudo chown root:root /etc/init.d/squeezeslave
    sudo chmod 755 /etc/init.d/squeezeslave
    sudo update-rc.d squeezeslave defaults
    ```

4.  Now all that is left is to create a config file

    ```bash
    sudo joe /etc/default/squeezeslave
    ```

    
    with the following content:
    
    ```bash
    SSMAC="xx:xx:xx:xx:xx:xx"
    SBSHOST= YOURSERVER
    SSOPTIONS="-o 0"
    ```

    
    Obviously you want to configure it to work with your server and add the MAC address which you find under HWaddr using
    
    ```bash
    ifconfig
    ```

5.  You can now either reboot your machine or start the service manually

    ```bash
    sudo service squeezeslave start
    ```

Another problem is that the Raspbian by default boots at a rather low audio volume. This can be fixed by

1.  setting the volume with the command line mixer

    ```bash
    sudo apt-get install alsa-utils
    alsamixer
    ```

2.  and storing the settings

    ```bash
    sudo alsactl store
    ```
