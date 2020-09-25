#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
    Copyright (c) 2020 Patrick Moffitt
    List installed modules.
"""
import pkg_resources
import sys
import json

installed_packages = pkg_resources.working_set
installed_packages_list = []
for i in installed_packages:
    installed_packages_list.append({'name': i.project_name, 'version': i.version})

installed_packages_list.sort(key=lambda k: dict(k)['name'].lower())
print(json.JSONEncoder().encode(installed_packages_list), file=sys.stdout, flush=True)
