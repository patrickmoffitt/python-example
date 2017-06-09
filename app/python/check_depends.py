#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
    Copyright (c) 2017 Patrick Moffitt

    Attempt to import module dependencies and report errors.
"""

from importlib import import_module
import sys

depends = ['pkgutil', 'importlib', 'sys', 're', 'json']

for mod in depends:
    try:
        mod = import_module(mod)
    except ModuleNotFoundError as e:
        print('Please install the following required Python modules:', depends, file=sys.stderr, flush=True)
        exit(1)
