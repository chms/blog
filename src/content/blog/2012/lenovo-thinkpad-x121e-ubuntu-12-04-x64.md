---
title: 'Lenovo Thinkpad X121e + Ubuntu 12.04 x64'
pubDate: 'Jul 08 2012'
tags: ['Linux', 'Technology']
---

I have already blogged about how cool my new Thinkpad X121e setup running on Ubuntu 12.04 x64 is. I'd like to get a little bit more technical in this post. First of all, as so many have asked before: AMD E-450s (but also E-350s) can play Full-HD videos in Linux!!!

So here's my setup

Lenovo Thinkpad X121e  
Processor: AMD E-450  
Graphics: Radeon HD 6320  
8GB RAM  
WIFI: ... see below

Installing Ubuntu 12.04 is really easy, just download the \*.iso from ubuntu.com, create a bootable flash drive using the Universal USB Installer from www.pendrivelinux.com and boot from it.

Everything should work out of the box but these three things:

1.) Full-HD video acceleration

First of all: Yes I can watch Full-HD videos on my machine! Here's what you have to do:

The standard open source driver that comes with Ubuntu can't do it and you need additional software to really get it working. First you need to install the proprietary driver from AMD. Right now it seems that only Catalyst 12.4 is working for the E-450. (I tried the 12.6 version just yesterday, AMD did not sign it for the E-450, so leave your hands from this one). Although Ubuntu offers you to install the proprietary driver, I would do it manually. Here's how to

1.1.1 Get the 12.4 driver for Linux x64 from AMD's website (Not the 12.06 version!!!!!)  
1.1.2 Follow the steps from [https://help.ubuntu.com/community/BinaryDriverHowto/ATI](https://help.ubuntu.com/community/BinaryDriverHowto/ATI), scroll down to the "Manually installing Catalyst" section and do everything as stated there, except replace the version number with 12.4.

So far so good, now reboot your machine. To play Full-HD movies you'll have two options  
1.2.1 Use the XBMC that plays along with XvBA (see [http://forum.xbmc.org/showthread.php?tid=116996](https://help.ubuntu.com/community/BinaryDriverHowto/ATI) for how to install it) for watching Full-HD stuff  
1.2.2 Open a terminal and use "sudo apt-get install xvba-va-driver libva-glx1 vainfo" to install a kind of wrapper for AMD's XvBA needed. Also install VLC, open it and select "Use GPU accelerated decoding" under Tools -> Preferences -> Input & Codecs. After restarting VLC you should be able to watch Full-HD properly. If you are having problems search the web for "AMD vaapi xvba-va-driver" or similar terms. It worked for me out of the box.

2.) WIFI

The Wifi card that comes with the machine, is a real horror for Ubuntu. I even tried to download the driver from Realtek (which is the manufacturer of the card) directly and compile it myself. Even with that I did not get a stable connection when the signal was weak or when I was in a WIFI crowded area. What solved my problem was buying an Intel 6200 WIFI card and a half-> full size PCI card adapter, which was 15€  for both on ebay. - Remove your Realtek card, plug the WIFI card + adapter into the spare port of your PC and you're good to go. The Linux kernel 3.2 supports the Intel 6200 out of the box.  Some might ask why not to use the port where I removed the Realtek WIFI card. Well that is because the Lenovo BIOS won't let you use it there (Unless you modify the bios which is really tricky and dangerous)

3.) The trackpoint

I've never had a trackpoint before, but I really love it now. It is a shame that  one out of 10 time when I start the computer it does not work. The following commands make it work again:

\>> sudo modprobe -r psmouse  
\>> sudo modprobe psmouse

It takes a few seconds for psmouse to load, but then everything should work again. I am thinking about putting this code into /etc/rc.local or something, but right now I just type it every time I have problems.

I hope this guide is helpful. Let me know if you're having problems or suggestions!
