/**
 * VK plugin for Showtime
 *
 *  Copyright (C) 2015 Anatoly Shcherbinin (Cy-4AH)
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var page = require('movian/page');
var service = require('movian/service');
var settings = require('movian/settings');
var http = require('movian/http');
var XML = require('movian/xml');
var plugin = JSON.parse(Plugin.manifest);
var logo = Plugin.path + "logo.jpeg";

RichText = function (x) {
    this.str = x ? x.toString() : "";
}

RichText.prototype.toRichString = function (x) {
    return this.str;
}

var blue = '6699CC', orange = 'FFA500', red = 'EE0000', green = '008B45';

function coloredStr(str, color) {
    return '<font color="' + color + '">' + str + '</font>';
}

function bytesToSize(bytes) {
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0) return '0 Byte';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

service.create(plugin.title, plugin.id + ":start", "video", true, logo);

settings.globalSettings(plugin.id, plugin.title, logo, plugin.synopsis);

settings.createString('baseURL', "Nyaa base URL without '/' at the end", 'http://www.nyaa.si', function (v) {
    service.baseUrl = v;
});

settings.createString('minSeed', "Min seeds allowed", "50", function (v) {
    service.minSeed = v;
});

function setPageHeader(page, title) {
    page.loading = true;
    if (page.metadata) {
        page.metadata.title = title;
        page.metadata.logo = logo;
    }
    page.type = "directory";
    page.contents = "items";
}

new page.Route(plugin.id + ":start", function (page) {
    setPageHeader(page, plugin.synopsis);
    page.appendItem(plugin.id + ":search:", 'search', {
        title: 'Search at ' + service.baseUrl
    });
    page.loading = false;
});

new page.Route(plugin.id + ":search:(.*)", function (page, query) {
    searchOnNyaa(page, query);
});

page.Searcher(plugin.id, logo, function (page, query) {
    searchOnNyaa(page, query);
});

function searchOnNyaa(page, query) {
    setPageHeader(page, plugin.title);
    page.entries = 0

    var offset = 1;

    page.loading = true;
    query.offset = offset;
    var doc = XML.parse(http.request(service.baseUrl, {
            args: {
                page: "rss",
                term: query
            }
        }
    ).toString());
    ++offset;

    var allItems = doc.rss.channel.filterNodes('item');
    if (0 === allItems.length) {
        page.loading = false;
        return false;
    }
    for (var i in allItems) {
        var item = allItems[i];
        if (isAnimeWithEnglishSubs(item) && hasEnoughSeeders(item)) {
            page.appendItem("torrent:browse:" + item.link, 'video', {
                title: item.title,
                description: new RichText(item.description),
                genre: new RichText(coloredStr('S: ', orange) + coloredStr(item.seeders, green) +
                    coloredStr(' P: ', orange) + coloredStr(item.leechers, red) +
                    coloredStr(' Size: ', orange) + item.size)
            });
            page.entries++
        }
    }
    page.loading = false;
    return true;
}

function isAnimeWithEnglishSubs(item) {
    return item.categoryId === "1_2"
}

function hasEnoughSeeders(item) {
    return item.seeders >= service.minSeed
}
