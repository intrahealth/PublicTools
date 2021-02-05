<template>
  <v-container grid-list-xs>
    <v-dialog
      persistent
      v-model="warnDelete"
      max-width="440"
    >
      <v-card>
        <v-toolbar
          color="error"
          dark
        >
          <v-toolbar-title>
            <v-icon>mdi-alert-circle-outline</v-icon>
            Confirm
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn
            icon
            dark
            @click.native="warnDelete = false"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-card-text>
          <b>Are you sure you want to delete selected {{selected.length}} practitioners?<br>Selected practitioners will also be deleted in rapidpro</b>
        </v-card-text>
        <v-card-actions>
          <v-btn
            dark
            class="white--font"
            color="green"
            @click="warnDelete = false"
          >
          No</v-btn>
          <v-spacer />
          <v-btn
            dark
            class="white--font"
            color="error"
            @click="deletePractitioner"
          >Yes</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    Select practitioners to delete
    <v-layout row wrap>
      <v-flex xs4>
        <ihris-search-term
          v-on:termChange="searchData"
          label="Fullname"
          expression="fullname"
          :reportData="reportData"
          :hideFilters="hideFilters"
        />
      </v-flex>
      <v-flex xs4>
        <ihris-search-term
          v-on:termChange="searchData"
          label="Contact Group"
          expression="groupname"
          isDropDown="true"
          :reportData="reportData"
          :hideFilters="hideFilters"
        />
      </v-flex>
      <v-flex xs4>
        <ihris-search-term
          v-on:termChange="searchData"
          label="Facility"
          expression="facilityName"
          isDropDown="true"
          :reportData="reportData"
          :hideFilters="hideFilters"
        />
      </v-flex>
      <v-flex xs4>
        <ihris-search-term
          v-on:termChange="searchData"
          label="Region"
          expression="regionName"
          isDropDown="true"
          :reportData="reportData"
          :hideFilters="hideFilters"
        />
      </v-flex>
      <v-flex xs4>
        <ihris-search-term
          v-on:termChange="searchData"
          label="Job Title"
          expression="job"
          isDropDown="true"
          :reportData="reportData"
          :hideFilters="hideFilters"
        />
      </v-flex>
      <v-flex xs4>
        <ihris-search-term
          v-on:termChange="searchData"
          label="Cadre"
          expression="cadre"
          isDropDown="true"
          :reportData="reportData"
          :hideFilters="hideFilters"
        />
      </v-flex>
    </v-layout>
    <v-data-table
      style="cursor: pointer"
      :headers="headers"
      :items="results"
      :options.sync="options"
      :server-items-length="total"
      :footer-props="{ 'items-per-page-options': itemsPerPage }"
      :loading="loading"
      class="elevation-1"
      item-key="id"
      show-select
      v-model="selected"
    >
      <template v-slot:item.mheropractitioner="{ item }">
        <span>{{ item.mheropractitioner.replace('Practitioner/', '') }}</span>
      </template>
    </v-data-table>
    <v-btn
      color="error"
      @click="warnDelete = true"
      :disabled="selected.length === 0"
    >
      <v-icon left>mdi-delete</v-icon>
      Delete Selected
    </v-btn>
  </v-container>
</template>

<script>
import searchTerm from "../components/ihris-es-search-term";
export default {
  data: () => {
    return {
      terms: {},
      hideFilters: false,
      warnDelete: false,
      headers: [{
        "text": "ID",
        "value": "mheropractitioner"
      }, {
        "text": "Fullname",
        "value": "fullname"
      }, {
        "text": "Phone Number",
        "value": "phone"
      }, {
        "text": "Contact Group",
        "value": "groupname"
      }, {
        "text": "Facility",
        "value": "facilityName"
      }, {
        "text": "County",
        "value": "regionName"
      }, {
        "text": "Job Title",
        "value": "job"
      }, {
        "text": "Cadre",
        "value": "cadre"
      }],
      results: [],
      options: { itemsPerPage: 10 },
      loading: false,
      total: 0,
      prevPage: -1,
      link: [],
      selected: [],
      error_message: null,
      selectAll: false,
      reportData: {
        fieldsDetails: [
          [
            "Fullname",
            "fullname"
          ],
          [
            "Phone Number",
            "phone"
          ],
          [
            "Contact Group",
            "groupname"
          ],
          [
            "Facility",
            "facilityName"
          ],
          [
            "Region",
            "regionName"
          ],
          [
            "Job Title",
            "job"
          ],
          [
            "Cadre",
            "cadre"
          ]
        ],
        filters: [
          {
            field: "fullname",
            display: "Fullname",
            isDropDown: false,
            dataType: "text"
          },
          {
            field: "groupname",
            display: "Contact Group",
            isDropDown: true,
            dataType: "text"
          },
          {
            field: "facilityName",
            display: "Facility",
            isDropDown: true,
            dataType: "text"
          },
          {
            field: "regionName",
            display: "Region",
            isDropDown: true,
            dataType: "text"
          },
          {
            field: "job",
            display: "Job Title",
            isDropDown: true,
            dataType: "text"
          },
          {
            field: "cadre",
            display: "Cadre",
            isDropDown: true,
            dataType: "text"
          }
        ],
        displayCheckbox: true,
        indexName: "mheropractitioner"
      }
    }
  },
  watch: {
    options: {
      handler() {
        this.getTotalRecords();
        this.getData();
      },
      deep: true
    },
    terms: {
      handler() {
        this.selectAll = false
        this.getTotalRecords();
        this.getData(true);
      },
      deep: true
    }
  },
  methods: {
    searchData: function(expression, value) {
      this.$set(this.terms, expression, value);
    },
    buildTerms() {
      let body = {
        query: {
          bool: {
            must: []
          }
        }
      }
      if(Object.keys(this.terms).length > 0) {
        for(let sTerm in this.terms) {
          if(!this.terms[sTerm] || this.terms[sTerm].length === 0) {
            continue;
          }
          let sTermDet = this.reportData.filters.find((filter) => {
            return filter.field === sTerm
          })
          if(!sTermDet.isDropDown) {
            this.terms[sTerm] = this.terms[sTerm].replace(/\s+/g, ' ').trim()
          }
          let esFieldName
          if(sTermDet.isDropDown) {
            esFieldName = sTerm + '.keyword'
          } else {
            esFieldName = sTerm
          }
          if(Array.isArray(this.terms[sTerm])) {
            let terms = {
              terms: {}
            }
            terms.terms[esFieldName] = []
            for(let value of this.terms[sTerm]) {
              terms.terms[esFieldName].push(value)
            }
            body.query.bool.must.push(terms)
          } else {
            if(!sTermDet.isDropDown) {
              let termArr = this.terms[sTerm].split(' ')
              for(let tm of termArr) {
                let wildCard = {
                  wildcard: {}
                }
                wildCard.wildcard[esFieldName] = tm + '*'
                body.query.bool.must.push(wildCard)
              }
            } else {
              let terms = {
                terms: {}
              }
              terms.terms[esFieldName] = [this.terms[sTerm]]
              body.query.bool.must.push(terms)
            }
          }
        }
      }
      return body
    },
    getTotalRecords() {
      let url = `/es/mheropractitioner/_count`
      let body = this.buildTerms()
      fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body)
        }).then(response => {
          response
            .json()
            .then(data => {
              this.total = data.count
            })
        })
    },
    getData(restart) {
      this.loading = true;
      this.error_message = null;
      let url = "";
      if (restart) this.options.page = 1;
      let count = this.options.itemsPerPage || 10;
      if(count === -1) {
        count = this.total
      }
      let from = (this.options.page * this.options.itemsPerPage) - this.options.itemsPerPage
      url = `/es/mheropractitioner/_search?size=${count}&from=${from}`
      this.prevPage = this.options.page;

      let body = this.buildTerms()
      let sorting = []
      for(let index in this.options.sortBy) {
        let sortCol = this.options.sortBy[index]
        let sort = {}
        if(this.options.sortDesc[index]) {
          sort[sortCol + '.keyword'] = 'desc'
        } else {
          sort[sortCol + '.keyword'] = 'asc'
        }
        sorting.push(sort)
      }
      body.sort = sorting
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      }).then(response => {
          response
            .json()
            .then(data => {
              this.results = [];
              if (data.hits.total.value > 0) {
                this.link = data.link;
                let processed = []
                for (let hit of data.hits.hits) {
                  let exist = processed.find((id) => {
                    return id === hit._source.mheropractitioner
                  })
                  if(exist) {
                    continue
                  }
                  processed.push(hit._source.mheropractitioner)
                  let result = {}
                  for(let field in hit['_source']) {
                    result[field] = hit['_source'][field]
                  }
                  result.id = hit['_id']
                  this.results.push(result)
                }
              }
              if(this.selectAll) {
                this.selected = this.results
              } else {
                this.selected = []
              }
              this.loading = false;
            })
            .catch(err => {
              this.loading = false;
              this.error_message = "Unable to load results.";
              console.log(err);
            });
        })
        .catch(err => {
          this.loading = false;
          this.error_message = "Unable to load results.";
          console.log(err);
        });
    },

    deletePractitioner() {
      this.warnDelete = false
      let data = {
        practitioners: []
      }
      for(let selected of this.selected) {
        data.practitioners.push(selected.id)
      }
      let url = "/cleaning/deletePractitioners";
      let opts = {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data),
        redirect: "manual"
      };
      this.$store.state.progress.enabled = true
      this.$store.state.progress.title = "Deleting Practitioner(s)"
      fetch(url, opts).then(() => {
        this.$store.state.progress.enabled = false
        this.$store.state.statusDialog.enable = true
        this.$store.state.statusDialog.color = 'info'
        this.$store.state.statusDialog.title = 'Info'
        this.$store.state.statusDialog.description = 'Practitioners Deleted'
      })
      .catch(err => {
        this.$store.state.progress.enabled = false
        this.$store.state.statusDialog.enable = true
        this.$store.state.statusDialog.color = 'error'
        this.$store.state.statusDialog.title = 'Error'
        this.$store.state.statusDialog.description = 'Failed to Cancel Schedule'
        console.log(err);
      });
    }
  },
  computed: {
    itemsPerPage() {
      let items = [5,10,20,50]
      return items
    }
  },
  components: {
    ihrisSearchTerm: searchTerm
  },
  mounted: function() {
    this.getTotalRecords();
    this.getData(true);
  }
}
</script>