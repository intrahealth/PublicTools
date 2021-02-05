function isFromRP(resource) {
  if(resource.identifier) {
    for(let ident of resource.identifier) {
      if(ident.system === "http://app.rapidpro.io/contact-uuid" && ident.value === resource.id) {
        return 'Yes'
      }
    }
  }
  return 'No'
}

let res = {
  "resourceType": "Practitioner",
  "id": "7248b58f-4a53-4f71-b791-a8f8200957a7",
  "meta": {
    "versionId": "1",
    "lastUpdated": "2020-11-30T13:49:45.664+03:00",
    "source": "#MK8J5LZC6maxiaKv"
  },
  "identifier": [
    {
      "system": "http://app.rapidpro.io/contact-uuid",
      "value": "7248b58f-4a53-4f71-b791-a8f8200957a7"
    }
  ],
  "name": [
    {
      "use": "official",
      "text": "Ramla Muslin Khamisi"
    }
  ],
  "telecom": [
    {
      "system": "phone",
      "value": "+254712527636"
    }
  ]
}
let val = isFromRP(res)
console.log(val);