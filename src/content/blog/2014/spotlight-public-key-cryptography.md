---
title: 'Spotlight: Public-Key Cryptography'
pubDate: 'May 30 2014'
tags: ['Engineering', 'Online', 'Technology', 'Spotlight']
---

[Public-Key Cryptography](http://en.wikipedia.org/wiki/Public-key_cryptography) is a truly magical thing and I often wonder why we don't use it more often. We go on and complain about how it is too easy for government agencies to look into our digital lives, while we do have all the tools to prevent it. Only we don't use them and we don't seem to ask facebook, gmail and so on to use them - not that they would. The funny part is that it would not require a lot of effort, because computers could automatically do all of that stuff in the background. All that would be needed is that we were able to securely store one, long password (the private key).

![](http://upload.wikimedia.org/wikipedia/commons/a/a2/Standard-lock-key.jpg)

In a nutshell public-key cryptography is a mathematical concept that allows us to encrypt a message that is intended to be read by just one person and to sign something to guarantee that it really came from you.

Let's take a closer look: public-key cryptography is based on a pair of keys, lets call them #1 and #2. When one uses key #1 to encrypt a message one can only decrypt it again using key #2. The same is true for a message encrypted with key #2 - it can only be decrypted using key #1. In other words the two keys are kind of reversible operations that work in both directions. For instance

-   Plain text -> Apply Key #1 -> Cypher Text -> Apply Key #2 -> Original Plain Text
-   Plain text -> Apply Key #2 -> Cypher Text -> Apply Key #1 -> Original Plain Text

but

-   Plain text -> Apply Key #2 -> Cypher Text -> Apply Key #2 -> Nonsense
-   Plain text -> Apply Key #2 -> Cypher Text -> Try something -> Nonsense

In addition to that it is important to know that it is (almost) impossible to find the keys from the Plain text and/or the Cypher Text. Usually a person or entity (lets call this entity Alice) creates a pair of keys, where one is made public (the public key) and where the other key is kept secret. There are two typical use cases:

1.  Anyone can encrypt a message using the public key and send it to Alice. Only Alice and nobody else (e.g., someone who intercepts the cypher text) will be able to read the plain text when only Alice knows her secret key. - This use case is also called "Public-key encryption".
2.  Alice can encrypt a message using her private key and send it to anyone. If it can be decrypted using the Alice's public key, one has a guarantee that the original message really came from Alice. - This use case is also called "Digital signing".

The secret key is Alice's crown jewel that she must not lose or share with anyone, because anyone in possession of the secret key can do what Alice can do. Well that is why it's called the secret key. Again, all of this can stay in the background and as it can be done for you by software on your computer/phone/..., that has access to your locally stored secret key. If you are interested in implementing some of this stuff in your life, you might want to take a look at

-   [GNU Privacy Guard](http://en.wikipedia.org/wiki/GNU_Privacy_Guard) (e.g., for protecting your e-mails)
-   [Threema](https://threema.ch/en/) (for protecting texting on your phone)

Just by reading this article and by understanding it, you should have a pretty good idea about what level of protection encryption can give you and where potential problems may lie. Again, never forget: your secret key is your crown jewel that you must never share and that your software must never leak. By the way, this is something that is especially hard to check with closed source software and also something that the [heartbleed bug](http://en.wikipedia.org/wiki/Heartbleed) may have caused.
