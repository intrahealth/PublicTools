<template>
  <v-container grid-list-xs>
    <v-list dense>
      <v-list-group
        no-action
        sub-group
      >
        <template v-slot:activator>
          <v-list-item-content>
            <v-list-item-title>
              <v-icon
                left
                color="red darken-2"
              >
                mdi-spray-bottle
              </v-icon>
              Data Cleaning
            </v-list-item-title>
          </v-list-item-content>
        </template>
        <v-list-item
          key="deletePractitioner"
          link
          to="deletePractitioner"
        >
          <v-list-item-icon>
            <v-icon
              light
              color="teal darken-2"
            >
              mdi-delete
            </v-icon>
          </v-list-item-icon>
          <v-list-item-title>Delete Practitioners</v-list-item-title>
        </v-list-item>
        <v-list-item
          key="singlePhoneMultiplePract"
          link
          to="singlePhoneMultiplePract"
        >
          <v-list-item-icon>
            <v-icon
              light
              color="teal darken-2"
            >
              mdi-delete
            </v-icon>
          </v-list-item-icon>
          <v-list-item-title>Practitioners Sharing Phone</v-list-item-title>
        </v-list-item>
      </v-list-group>
    </v-list>
  </v-container>
</template>
