<template>
  <v-container grid-list-xs>
    <v-dialog
      persistent
      v-model="warnPopulate"
      max-width="520"
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
            @click.native="warnPopulate = false"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-card-text>
          <b>Report generation will take almost 1 hour, do you still want to proceed?</b>
        </v-card-text>
        <v-card-actions>
          <v-btn
            dark
            class="white--font"
            color="green"
            @click="warnPopulate = false"
          >
          No</v-btn>
          <v-spacer />
          <v-btn
            dark
            class="white--font"
            color="error"
            @click="populateReport"
          >Yes</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-btn color="success" @click="warnPopulate = true">Generate Report</v-btn>
    <br><br>Practitioners sharing phone numbers
    <v-data-table
      :headers="headers"
      :items="contactsSharingPhone"
      :loading="loading"
      class="elevation-1"
      item-key="id"
      show-expand
      single-expand
    >
      <template
        slot="items"
        slot-scope="props"
      >
        <td>{{props.item.name}}</td>
        <td>{{props.item.phone.join(', ')}}</td>
      </template>
      <template v-slot:expanded-item="{ headers, item }">
        <td :colspan="headers.length">
          <v-data-table
            :headers="headers"
            :items="item.shares"
            :loading="loading"
            item-key="id"
            hide-default-footer
          >
            <template
              slot="items"
              slot-scope="props"
            >
              <td>{{props.item.phone.join(', ')}}</td>
            </template>
          </v-data-table>
        </td>
      </template>
    </v-data-table>
  </v-container>
</template>
<script>
export default {
  data: () => {
    return {
      warnPopulate: false,
      loading: false,
      contactsSharingPhone: [],
      headers: [{
        "text": "name",
        "value": "name"
      }, {
        "text": "Phone",
        "value": "phone"
      }, {
        "text": "From Rapidpro",
        "value": "isFromRP"
      }, {
        "text": "ID",
        "value": "id"
      }]
    }
  },
  methods: {
    populateReport() {
      let url = "/cleaning/populateContactsSharingPhone";
      let opts = {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        },
        redirect: "manual"
      };
      fetch(url, opts).then(() => {
        this.$store.state.statusDialog.enable = true
        this.$store.state.statusDialog.color = 'success'
        this.$store.state.statusDialog.title = 'Info'
        this.$store.state.statusDialog.description = 'Report generation is in progress, you may need to wait for 1 hour'
      })
      .catch(err => {
        this.$store.state.statusDialog.enable = true
        this.$store.state.statusDialog.color = 'error'
        this.$store.state.statusDialog.title = 'Error'
        this.$store.state.statusDialog.description = 'Failed to populate practitioners'
        console.log(err);
      });
    },
    getContactsSharingPhone() {
      let url = "/cleaning/getContactsSharingPhone";
      let opts = {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        },
        redirect: "manual"
      };
      this.loading = true
      this.$store.state.progress.enabled = true
      this.$store.state.progress.title = "Getting Practitioner(s)"
      fetch(url, opts).then(response => {
          response
            .json()
            .then(data => {
              this.contactsSharingPhone = data
              this.loading = false
              this.$store.state.progress.enabled = false
            })
        })
      .catch(err => {
        this.loading = false
        this.$store.state.progress.enabled = false
        this.$store.state.statusDialog.enable = true
        this.$store.state.statusDialog.color = 'error'
        this.$store.state.statusDialog.title = 'Error'
        this.$store.state.statusDialog.description = 'Failed to get practitioners'
        console.log(err);
      });
    }
  },
  created() {
    this.getContactsSharingPhone()
  }
}
</script>