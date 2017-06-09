#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
    Copyright (c) 2017 Patrick Moffitt
    List all the top-level modules installed.
"""

from pkgutil import iter_modules
from importlib import import_module
from io import StringIO
import sys
import re
import json

"""
    Until the Python community realizes the potential of PEP 396
    https://www.python.org/dev/peps/pep-0396/
    The following regex is needed to scrape the output of __version__.
"""
regex = r'(\d{1,4}(?:\.|\d{0,4})){1,4}'
modules = []
package_names = []

for package in iter_modules():
    if hasattr(package, 'name'):
        package_names.append(package.name)
    else:
        package_names.append(package[1])

for name in sorted(package_names, key=str.lower):
    """
        Only look at real packages, not Python Easter eggs; antigravity, or this.
        Also, do not load win32trace. It hacks off with stdout. Lastly, _license
        is not a module.

        This approach seems fragile. Evidently loading a Python module is like
        Forest Gump's box of chocolates; you never know what you're going to get.
        This method of loading and looking for a __version__ would be more
        certain for detecting an author's selected list of modules rather than
        what iter_modules can scrape together. Presumeably the author would know
        what to expect upon loading and could handle the result.
    """
    try:
        if name not in ['antigravity', 'this', 'win32traceutil', '_license']:
            mod = import_module(name)
            if hasattr(mod, '__version__') and isinstance(mod.__version__, str):
                for m in re.finditer(regex, mod.__version__):
                    modules.append({'name': name, 'version': m.group(0)})
    except Exception as error:
        print(name, error, file=sys.stderr, flush=True)
    finally:
        """ Python 3 can unload modules. Doing so saves resources. """
        if name in sys.modules:
            del sys.modules[name]
            del name

print(json.JSONEncoder().encode(modules), file=sys.stdout, flush=True)
