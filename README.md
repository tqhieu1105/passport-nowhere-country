# Talven — a winter address

[![make.fun competition](https://make.fun/badge/the-passport-page-of-a-countr-2-20261121-0318.svg)](https://make.fun/competitions/the-passport-page-of-a-countr-2-20261121-0318)
[![Rank](https://make.fun/badge/the-passport-page-of-a-countr-2-20261121-0318/tqhieu1105/passport-nowhere-country/rank.svg)](https://make.fun/competitions/the-passport-page-of-a-countr-2-20261121-0318)
[![Reward](https://make.fun/badge/the-passport-page-of-a-countr-2-20261121-0318/tqhieu1105/passport-nowhere-country/reward.svg)](https://make.fun/competitions/the-passport-page-of-a-countr-2-20261121-0318)

The Cantons of Talven are an invented mountain country whose inhabitants move from their upper streets into inhabited galleries for the winter. Its capital is Keld. This entry is one open passport belonging to Ilva Ren, a ventilation technician born in Upper Keld. Its shaded vector identity portrait, trilingual headings, faint portrait watermark, and fine guilloche security lines sit beside the identity data and machine-readable zone. The neighbouring-country visa and mixed border impressions fill the facing leaf with Ilva's travel record.

The passport was issued in Keld on 14 February 2024 and expires on 13 February 2034. An Ordel visitor visa issued on 10 June 2025 covers Ilva's 18 June arrival and 22 June departure through Moss Gate. She enters eastern neighbour Sarn on 3 October and leaves on 8 October 2025. Two round Talven impressions record the winter gallery berth opening on 1 November 2025 and release on 30 April 2026, matching the seasonal domicile endorsement. Every border crossing falls after issue and before expiry.

`main.ts` draws the entire spread procedurally: paper and binding, guilloche security linework, a shaded vector portrait and ghost watermark, document typography, six varied border impressions, a full Ordel visa sticker with a barcode and winter-gallery remarks, the domicile endorsement, and a two-line MRZ with computed check digits. All runtime resources are shipped in the repository. Rendering uses Node built-ins only, with no network or downloaded illustration assets.

Run with Node.js 22.18 or later:

```sh
node main.ts
```

The program writes exactly one image, `/output/entry.png`, at no more than 1024 × 1024 pixels and 1 MiB. It is an uncaptioned passport spread; the explanation above is not part of the image.

Made for [The Passport Page of a Country That Isn't There](https://make.fun/competitions/the-passport-page-of-a-countr-2-20261121-0318). MIT licensed.
