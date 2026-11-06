---
title: 'A Family Data Plan: Data Storage'
pubDate: 'Nov 06 2026'
tags: ['DIY', 'Technology']
---

So where do we actually store our data, and how do we interact with it?

### Where Do We Store Our Data?

There are two main containers that hold the bits and bytes.

- **Network Attached Storage (NAS)**  
Every family should have one. I built the hardware myself around a 20-core Intel CPU with ample RAM, plus HDD storage and SSDs for caching. It runs Proxmox with a large TrueNAS virtual machine, where all data lives in encrypted ZFS datasets.

:mdi-nas=12:

- **Proton**  
As soon as you want reliable email, there's essentially no way around a hosted provider, and most of them bundle cloud storage. You could choose a big tech provider like Google and pay with your data. We decided to go with a Proton family plan.
<!--more-->
### How Do We Interact with Our Data?

Depending on the need, we access our data in different ways.

#### NAS

All services below run as apps in TrueNAS, with per-user accounts protected by password or key authentication. They are only reachable from the local network, or from outside via WireGuard VPN. The one exception is Git: git.vs56.net accepts SSH connections from anywhere on the internet.

- **Network drives**  
Samba, a timeless classic. Typically mapped to drive letters on Windows machines, with both private per-user directories and shared drives (e.g., media).

- **Nextcloud**  
A modern open-source workspace platform. We use it to sync contacts, calendars and files.

- **Git**  
For projects that evolve over time, where version control is central, there's a Forgejo server.

- **Plex**  
For when media consumption and ease of use, e.g., via an Apple TV, are front and center.

#### Proton

Our Proton family plan offers plenty of shared storage for both email and files.

- **Proton Mail**  
An encrypted email service with a focus on privacy.

- **Proton Drive**  
For when access over the internet is essential (and for backups, but more on that in another post).

### How Does This Relate to the Data Classification Tiers?

Both data stores (NAS and Proton) and the services on top of them (network drives, Nextcloud, Git and Proton Drive) can hold data of every tier defined in our [data classification scheme](/blog/data-plan-data-classification), with the following additional guidance:

- **T1:** We always keep these in KeePass databases, passwords and sensitive documents alike. Only the encrypted database files are moved around, so they can be stored on any of the systems above.

- **T2:** Each family member has an account on Proton Drive, Nextcloud, Forgejo and the NAS, with dedicated private folders or repositories.

- **T3:** We also maintain shared folders in all of these systems. When sharing files with people outside the family, we typically use Proton Drive, since it's the only storage they can reach.

- **T4:** Replaceable data, like our digitized media collection, lives only on the NAS, served via Samba and Plex. It doesn't need to be available on the go, and there's no point in spending cloud storage on files we could simply rip again.

- **T5:** Public data also lives beyond the NAS and Proton, for example public repositories on GitHub and this blog, served via Cloudflare. Still, we keep the source on the NAS, since the published copy may be the only one otherwise.