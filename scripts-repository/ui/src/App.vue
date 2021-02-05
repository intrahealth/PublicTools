<template>
  <v-app>
    <v-navigation-drawer
      width="280"
      v-model="drawer"
      clipped
      app
    >
      <app-menu />
    </v-navigation-drawer>
    <v-app-bar
      v-if='!$store.state.denyAccess'
      :clipped-left="$vuetify.breakpoint.lgAndUp"
      app
      color="primary"
      dark
    >
      <v-app-bar-nav-icon
        @click.stop="drawer = !drawer"
      />
      <v-toolbar-title
        style="width: 500px"
        class="ml-0 pl-4"
      >
        <span class="hidden-sm-and-down">Scripts Repository</span>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn
        color="dark"
        to="/logout"
        v-if='!$store.state.denyAccess'
      >
        <v-icon>mdi-logout</v-icon> Logout
      </v-btn>
    </v-app-bar>
    <v-content>
      <v-container
        class="fill-height"
        fluid
      >
        <v-dialog
          persistent
          v-model="$store.state.statusDialog.enable"
          max-width="600"
        >
          <v-card>
            <v-toolbar
              :color="$store.state.statusDialog.color"
              dark
            >
              <v-toolbar-title>
                <v-icon v-text="$store.state.statusDialog.icon"></v-icon>
                {{$store.state.statusDialog.title}}
              </v-toolbar-title>
              <v-spacer></v-spacer>
              <v-btn
                icon
                dark
                @click.native="$store.state.statusDialog.enable = false"
              >
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </v-toolbar>
            <v-card-text>
              <b>{{$store.state.statusDialog.description}}</b>
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn
                dark
                class="white--font"
                color="primary"
                @click="$store.state.statusDialog.enable = false"
              >Ok</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
        <v-dialog
          v-model="$store.state.progress.enabled"
          persistent
          width="300"
        >
          <v-card
            color="primary"
            dark
          >
            <v-card-text>
              {{$store.state.progress.title}}
              <v-progress-linear
                indeterminate
                color="white"
                class="mb-0"
              ></v-progress-linear>
            </v-card-text>
          </v-card>
        </v-dialog>
        <router-view />
      </v-container>
    </v-content>
  </v-app>
</template>

<script>

import menu from "@/components/menu";
export default {
  name: 'App',

  data: () => ({
    drawer: null,
  }),
  components: {
    'app-menu': menu
  }
};
</script>
