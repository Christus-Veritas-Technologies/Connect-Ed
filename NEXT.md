Currently, we have plans for zimbabwe using paynow, a local payment processor

Now, we want to add support for South African Rand (ZAR), wjhich will affect all amounts in the app, that includes fees and the like, instead of "$300" for USD, we'll have "ZAR6000"

So do this:"
(1) On the payments page, add 2 tabs:
i - USD
ii - ZAR

Allow the visitor to select their prefrred currency

(2) When ZAR is eleected, don't use paynow, intsead...use dodopayments "products" like this:
https://docs.dodopayments.com/features/products

We're using productd and not subsctiptions because:
i - We have a combined cost here, that of the one-time setup fee and that of the first subscription, we'd have to setup product payment or the one-time fee and then subscipritons fo rht emonthly fee, which is added compelxity
ii - Paynow does not have a recurring subscription modelm so we'd have a situation whereby we have a webhook or some automatic process to auto-send bills fr ppaynow but not for dodopayments, which creates a branch in logic


Using dodopayment p[roducts and [aynow ;logic allows us to create a unified step which allows us to send auto-re idners that work for both providerrs

(3) In the onboaridng, add a requried step that requests the user to select their countyr,c urrently we have the options of "Zimbabwe" and "South Africa", the selected country then defines the currncy, USD for Zim and ZAR for SA

Rther, use "R" instead of ZAR since that seems to be the official code for the south afaircna rand

(4) Add a setting that again allows the user to select their currency but there is yet another option: "ZiG"

So it's either USD: "$350", ZAR: "R4,800" or Zig: "ZiG 400,304,4039"

Use the same logic as the existing one