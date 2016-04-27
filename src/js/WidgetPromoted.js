/*global MashupPlatform, $ */

/*
 * widget-promoted
 * https://github.com/rockneurotiko/widget-promoted
 *
 * Copyright (c) 2016 CoNWeT
 * Licensed under the MIT license.
 */

/* exported WidgetPromoted */

var WidgetPromoted = (function () {

    "use strict";

    /*********************************************************
     ************************CONSTANTS*************************
     *********************************************************/

    const flavorurl = "http://130.206.113.159:8086/api/v1";
    const idmurl = "https://account.lab.fiware.org";

    /*********************************************************
     ************************VARIABLES*************************
     *********************************************************/

    /********************************************************/
    /**********************CONSTRUCTOR***********************/
    /********************************************************/

    var WidgetPromoted = function WidgetPromoted () {
        this.token = "";
        this.region = "";
        this.adminRegions = [];
        this.promotedflavors = [];
        this.flavors = [];
        this.reverseflavors = {};

        MashupPlatform.wiring.registerCallback("authentication", handleToken.bind(this));

        startAnimation();
        setEvents.call(this);
        checkUserPermission.call(this);
        getRegions.call(this);
    };

    /*********************************************************
     **************************PRIVATE*************************
     *********************************************************/


    var equalFlavors = function equalFlavors(flavor1, flavor2) {
        return flavor1.vcpus === flavor2.vcpus &&
            flavor1.ram === flavor2.ram &&
            flavor1.disk === flavor2.disk &&
            flavor1.swap === flavor2.swap;
    };

    var flavorInPromoted = function flavorInPromoted(flavor, promoted) {
        return promoted.filter(f => equalFlavors(f, flavor)).length > 0;
    };

    var fillRegionSelector = function fillRegionSelector(regions) {
        const $group = $("#regions_group");

        regions.forEach(function (region) {
            $("<option>")
                .val(region)
                .text(region)
                .appendTo($group);

            $("#region_selector")
                .prop("disabled", false);
            $('#region_selector').prop("title", "Choose Region");
            $("#region_selector").selectpicker({title: "Choose Region"});
            $('#region_selector').selectpicker('render');
            $("#region_selector").selectpicker("refresh");
        });
    };


    // var isAdmin = function isAdmin(roles) {
    //     for (let i = 0; i < roles.length; i++) {
    //         if (roles[i].name === "InfrastructureOwner" || roles[i].name === "InfrastructureManager") {
    //             return true;
    //         }
    //     }

    //     return false;
    // };

    var clearState = function clearState() {

    };

    var checkUserPermission = function checkUserPermission() {
        const options = {
            method: "GET",
            requestHeaders: {
                "X-FI-WARE-OAuth-Token": "true",
                "x-fi-ware-oauth-get-parameter": "access_token",
                Accept: "application/json"
            },
            onSuccess: response => {
                const responseBody = JSON.parse(response.responseText);
                if (responseBody.roles.filter(x => x === "InfrastructureManager") <= 0) {
                    // No InfrastructureManager, show warning
                    window.console.log("No InfrastructureManager!");
                }
            },

            onFailure: clearState.bind(this)
        };

        MashupPlatform.http.makeRequest(`${idmurl}/user`, options);
    };


    var getRegions = function getRegions() {
        const options = {
            method: "GET",
            requestHeaders: {
                "X-FI-WARE-OAuth-Token": "true",
                "X-FI-WARE-OAuth-Header-Name": "X-Auth-Token",
                Accept: "application/json"
            },
            onSuccess: response => {
                const responseBody = JSON.parse(response.responseText);
                const adminRegions = responseBody.Infrastructures;

                this.adminRegions = adminRegions;
                fillRegionSelector(adminRegions.map(x => x.name).sort());
            },
            onFailure: clearState.bind(this)
        };

        MashupPlatform.http.makeRequest(`${flavorurl}/nodes`, options);
    };

    var fillFlavors = function fillFlavors(flavors, promoted) {
        var father = $("#flavorsContainer");
        flavors.forEach(function (flavor) {
            $("<li></li>", {id: flavor.id})
                .addClass("list-group-item")
                .addClass("item")
                .addClass(flavorInPromoted(flavor, promoted) ? "active" : "")
                .text(flavor.name)
                .appendTo(father);
        });
    };

    var startAnimation = function startAnimation() {
        $("#spinner").show();
    };

    var stopAnimation = function stopAnimation() {
        $("#spinner").hide();
    };

    var allFlavors = function allFlavors() {
        fillFlavors(this.flavors, this.promotedflavors);

        if (this.flavors.length > 0) {
            stopAnimation();
        }
    };


    var getPromotedFlavors = function getPromotedFlavors(next) {
        next = next || (() => {}); // NOP

        const options = {
            method: "GET",
            requestHeaders: {
                "X-FI-WARE-OAuth-Token": "true",
                "X-FI-WARE-OAuth-Header-Name": "X-Auth-Token",
                Accept: "application/json"
            },
            onSuccess: response => {
                const responseBody = JSON.parse(response.responseText);
                this.promotedflavors = responseBody.flavors;

                next.call(this, responseBody.flavors);
            },

            onFailure: clearState.bind(this)
        };

        MashupPlatform.http.makeRequest(`${flavorurl}/promotedflavors`, options);
    };

    var getFlavorsRegion = function getFlavorsRegion(region, next) {
        next = next || (() => {}); // NOP

        if (!this.token) {
            MashupPlatform.widget.log("No token, connect the wiring!");
            // Error no token!
            return;
        }
        const options = {
            method: "GET",
            requestHeaders: {
                "X-FI-WARE-OAuth-Token": "true",
                "X-FI-WARE-OAuth-Header-Name": "X-Auth-Token",
                "X-Auth-Token-Keystone": this.token,
                Accept: "application/json"
            },
            onSuccess: response => {
                const responseBody = JSON.parse(response.responseText);
                this.flavors = responseBody.flavors;
                this.flavors.forEach(flav => {
                    this.reverseflavors[flav.id] = flav;
                });

                next.call(this, this.flavors);
            },

            onFailure: clearState.bind(this)
        };

        MashupPlatform.http.makeRequest(`${flavorurl}/regions/${region}/flavors`, options);
    };

    var promoteFlavor = function promoteFlavor(flavor, next) {
        const options = {
            method: "POST",
            postBody: JSON.stringify({flavor: flavor}),
            contentType: "application/json",
            requestHeaders: {
                "X-FI-WARE-OAuth-Token": "true",
                "x-fi-ware-oauth-get-parameter": "access_token",
                Accept: "application/json"
            },
            onSuccess: (response) => {
                const responseBody = JSON.parse(response.responseText);
                this.promotedflavors.push(responseBody.flavor);
                next();
            },

            onFailure: () => {
                // $(`#${flavor.id}`).removeClass("active");
            }
        };

        MashupPlatform.http.makeRequest(`${flavorurl}/promotedflavors`, options);
    };

    var unpromoteFlavor = function unpromoteFlavor(flavor, next) {
        const promotedList = this.promotedflavors.filter(pf => equalFlavors(pf, flavor));
        if (promotedList.length <= 0) {
            return;
        }

        const promoted = promotedList[0].id;

        const options = {
            method: "DELETE",
            requestHeaders: {
                "X-FI-WARE-OAuth-Token": "true",
                "x-fi-ware-oauth-get-parameter": "access_token",
                Accept: "application/json"
            },
            onSuccess: () => {
                next();
            },
            onFailure: () => { }
        };

        MashupPlatform.http.makeRequest(`${flavorurl}/promotedflavors/${promoted}`, options);
    };

    var showPromoted = function showPromoted(promoted) {
        promoted.forEach(p => {
            this.reverseflavors[p.id] = p;
        });

        fillFlavors(promoted, promoted);

        stopAnimation();
    };

    var handleToken = function handleToken(paramsraw) {
        this.token = JSON.parse(paramsraw).token;

        if (this.region !== "") {
            getPromotedFlavors.call(this, allFlavors);
            getFlavorsRegion.call(this, this.region, allFlavors);
        }

        window.console.log("TOKEN received");
    };

    var setEvents = function setEvents() {
        const mythis = this;

        $("#region_selector").change(function () {
            const value = $("#region_selector").val() || "";

            this.promotedflavors = [];
            this.flavors = [];
            this.reverseflavors = {};

            $("#flavorsContainer").empty();

            startAnimation();

            if (value === "Promoted") {
                this.region = "";

                getPromotedFlavors.call(this, showPromoted);
                return;
            }

            this.region = value;

            getPromotedFlavors.call(this, allFlavors);
            getFlavorsRegion.call(this, this.region, allFlavors);
        }.bind(this));

        $('body').on('click', '.list-group .list-group-item', function () {
            const $this = $(this);
            const id = $this.prop("id");
            const flavor = mythis.reverseflavors[id];
            const promote = !$this.hasClass("active");

            if (promote) {
                promoteFlavor.call(mythis, flavor, () => $this.toggleClass("active"));
            } else {
                unpromoteFlavor.call(mythis, flavor, () => $this.toggleClass("active"));
            }
        });
    };


    /****************************************/
    /************AUXILIAR FUNCTIONS**********/
    /****************************************/


    return WidgetPromoted;

})();
