# Talven — a winter address

[![make.fun competition](https://make.fun/badge/the-passport-page-of-a-countr-2-20261121-0318.svg)](https://make.fun/competitions/the-passport-page-of-a-countr-2-20261121-0318)
[![Rank](https://make.fun/badge/the-passport-page-of-a-countr-2-20261121-0318/tqhieu1105/passport-nowhere-country/rank.svg)](https://make.fun/competitions/the-passport-page-of-a-countr-2-20261121-0318)
[![Reward](https://make.fun/badge/the-passport-page-of-a-countr-2-20261121-0318/tqhieu1105/passport-nowhere-country/reward.svg)](https://make.fun/competitions/the-passport-page-of-a-countr-2-20261121-0318)

The Cantons of Talven are an invented mountain country whose inhabitants move from their upper streets into inhabited galleries for the winter. Its capital is Keld. This entry is one open passport belonging to Ilva Ren, a ventilation technician born in Upper Keld. Her plain identity portrait, official data fields, machine-readable zone, and neighbouring countries' border stamps make a working travel document. A registered winter address, **Gallery 04, Bay 118**, quietly explains the place that issued it.

The passport was issued in Keld on 14 February 2024 and expires on 13 February 2034. Ilva enters western neighbour Ordel on 18 June 2025 and leaves on 22 June; she enters eastern neighbour Sarn on 3 October 2025 and leaves on 8 October. Her winter domicile endorsement covers 1 November 2025 through 30 April 2026. Every border crossing falls after issue and before expiry.

`main.ts` draws the entire spread procedurally: paper and binding, security linework, a stylised vector portrait, document typography, individually inked border stamps, residence endorsement, and a two-line MRZ with computed check digits. All runtime resources are shipped in the repository. Rendering uses no network or downloaded illustration assets.

Run with Node.js 22.18 or later:

```sh
node main.ts
```

The program writes exactly one image, `/output/entry.png`, at no more than 1024 × 1024 pixels and 1 MiB. It is an uncaptioned passport spread; the explanation above is not part of the image.

Made for [The Passport Page of a Country That Isn't There](https://make.fun/competitions/the-passport-page-of-a-countr-2-20261121-0318). MIT licensed.
