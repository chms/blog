---
title: 'Logitech K810 + Ubuntu'
pubDate: 'Dec 18 2013'
tags: ['Linux']
---

The Logitech K810 is a nice keyboard, but it does not work with Ubuntu out of the box. Still contrary to what some websites might lead you to believe, it does work. The following instructions worked for me on Ubuntu 13.10 & 14.04.

1.  Start a terminal (terminal 1)
2.  Install the tools needed for this walk-through
    
    ```
    sudo apt-get install bluez-hcidump bluez-utils blueman
    ```

    
3.  Enable Bluetooth on your Ubuntu machine (you might have a hardware button, don't forget about that)
4.  Start the bluetooth manager (blueman) from your start menu, dash, or whatever other way of starting programs your desktop has
5.  Start another terminal (terminal 2) - yep you'll need two for this exercise
6.  Get the K810 into pairing mode by pressing the button on the back of the keyboard and then one of the device buttons on the front (F1-F3). You should see the bluetooth light flashing now.
7.  In terminal 1 run
    
    ```
    hcitool scan
    ```

    
    if the K810 is found this should give you something like
    
    ```
    Scanning ...
           xx:xx:xx:xx:xx:xx   Logitech K810
    ```

    
8.  Copy the address of your K810 (that's the xx:xx:xx:xx:xx:xx)
9.  In terminal 2 run
    
    ```
    sudo hcidump -at | grep pass
    ```

    
10.  In terminal 1 run
     
     ```
     sudo bluez-simple-agent hci0 xx:xx:xx:xx:xx:xx
     ```

     
11.  In terminal 2 you should now see the passkey which is a number
12.  Type that code on your K810 followed by enter
13.  The bluetooth manager should now show the K810.
14.  In blueman select the K810 and mark it as "trusted"
15.  Now click on Setup and follow the dialog box.
16.  Tada, you're done, you can now close all terminals as well as blueman.

## The Function Keys

By default, the function keys (the ones above the numbers row) are assigned to special functions like media control, which I find annoying. - Every time you want to do something normal like Alt-F4 or search via F3 you need the Fn key. Logitech's windows software on the other hand lets you invert the Fn key. Actually all the Windows software does is to send a certain string of commands to the keyboard, which some clever Linux Guru has reverse engineered and coded into a nice little program, that can be found at  [http://www.trial-n-error.de/posts/2012/12/31/logitech-k810-keyboard-configurator/](http://www.trial-n-error.de/posts/2012/12/31/logitech-k810-keyboard-configurator/). I'll again add a step-by-step guide:

1.  Optional: Go to [http://www.trial-n-error.de/posts/2012/12/31/logitech-k810-keyboard-configurator/](http://www.trial-n-error.de/posts/2012/12/31/logitech-k810-keyboard-configurator/) and read about how he did it ;)
2.  Install a compiler
    
    ```
    sudo apt-get install build-essential
    ```

    
3.  Download and extract Mario's program
    
    ```
    wget https://blog.chschmid.com/media/k810_conf-v0.1.tar.bz2
    tar -jxf k810_conf-v0.1.tar.bz2
    ```

    
4.  Compile it
    
    ```
    ./build.sh
    ```

    
5.  Run it
    
    ```
    sudo ./k810_conf -d /dev/hidraw<x> -f on
    ```

    
    You will have to replace <x> by the hid number that was assigned to your keyboard. In my case it is hidraw2. Of course there are more clever ways, but just work through the numbers brute force starting with hidraw0. - Mario's program is clever enough to detect if it's not the K810.
