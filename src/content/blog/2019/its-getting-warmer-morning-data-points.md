---
title: 'It''s Getting Warmer - Morning Data Points'
pubDate: 'Aug 06 2019'
tags: ['DIY', 'Engineering']
---

In [my previous post](/blog/its-getting-warmer-getting-netatmo-data-into-matlab/) I described how I got data from my weather station into MATLAB to help me answer my primary questions:

-   When to open the windows in the evening, to let in cool air?
-   When to close the windows again in the morning?

The data I have available covers 10 days, including a late July heat wave. At first I tried to understand when the lowest outside temperature was reached and when it increased again by more than 0.5 °C and 1 °C compared to the minimum.

| Day | Min Temperature (°C) | Time | Time +0.5°C | Time +1°C |
| --- | --- | --- | --- | --- |
| 18 Jul 2019 | 16.3 | 05:54 | 06:54 | 06:54 |
| 19 Jul 2019 | 17.0 | 05:56 | 06:52 | 07:12 |
| 20 Jul 2019 | 20.4 | 05.56 | 07:01 | 08:07 |
| 21 Jul 2019 | 20.7 | 05:45 | 07:00 | 07:56 |
| 22 Jul 2019 | 19.9 | 05:56 | 06:27 | 07:22 |
| 23 Jul 2019 | 20.4 | 06:14 | 07:05 | 08:21 |
| 24 Jul 2019 | 21.4 | 05:53 | 06:48 | 07:33 |
| 25 Jul 2019 | 22.1 | 06:16 | 06:51 | 07:17 |
| 26 Jul 2019 | 22.9 | 05:42 | 06:17 | 07:13 |
| 27 Jul 2019 | 23.1 | 05:50 | 06:36 | 07:36 |

If I had more data I'd plot a histogram of the times to decide when to close the window in the morning. For now, I can only come up with a "manual estimate" based on looking at the table above. I conclude: During summer I should close the window by 7:30 in order to optimally protect the cool indoor climate.
