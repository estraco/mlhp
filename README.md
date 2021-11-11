# mlhp

maybe php but better

## Multi-Language Hypertext Preprocessor

MLHP uses expressjs to host pages with code from nodejs, pytnon, and lua \
This uses XML-Like tags to enclose different methods and code in different languages \

The first goal is to make this code work:

```xml
<mlhp-GET>
    <mlhp-JS>
      return `GET from JS! ${Date.now()}`
    </mlhp-JS>
    <br>
    <mlhp-PY>
      import os
      return 'GET from PY! %d %d' % (time.time(), os.getuid())
    </mlhp-PY>
    <br>
    <mlhp-LUA>
      return 'GET from LUA! ' .. os.date()
    </mlhp-LUA>
</mlhp-GET>
<br>
<mlhp-POST>
    <mlhp-JS>
      return `POST from JS! ${Date.now()}`
    </mlhp-JS>
    <br>
    <mlhp-PY>
      return 'POST from PY! %d' % time.time()
    </mlhp-PY>
    <br>
    <mlhp-LUA>
      return 'POST from LUA! ' .. os.date()
    </mlhp-LUA>
</mlhp-POST>
<br>
<mlhp-PUT>
    <mlhp-JS>
      return `PUT from JS! ${Date.now()}`
    </mlhp-JS>
    <br>
    <mlhp-PY>
      return 'PUT from PY! %d' % time.time()
    </mlhp-PY>
    <br>
    <mlhp-LUA>
      return 'PUT from LUA! ' .. os.date()
    </mlhp-LUA>
</mlhp-PUT>
<br>
<mlhp-DELETE>
    <mlhp-JS>
      return `DELETE from JS! ${Date.now()}`
    </mlhp-JS>
    <br>
    <mlhp-PY>
      return 'DELETE from PY! %d' % time.time()
    </mlhp-PY>
    <br>
    <mlhp-LUA>
      return 'DELETE from LUA! ' .. os.date()
    </mlhp-LUA>
</mlhp-DELETE>
<br>
<mlhp-HEAD>
    <mlhp-JS>
      return `HEAD from JS! ${Date.now()}`
    </mlhp-JS>
    <br>
    <mlhp-PY>
      return 'HEAD from PY! %d' % time.time()
    </mlhp-PY>
    <br>
    <mlhp-LUA>
      return 'HEAD from LUA! ' .. os.date()
    </mlhp-LUA>
</mlhp-HEAD>
<br>
<mlhp-OPTIONS>
    <mlhp-JS>
      return `OPTIONS from JS! ${Date.now()}`
    </mlhp-JS>
    <br>
    <mlhp-PY>
      return 'OPTIONS from PY! %d' % time.time()
    </mlhp-PY>
    <br>
    <mlhp-LUA>
      return 'OPTIONS from LUA! ' .. os.date()
    </mlhp-LUA>
</mlhp-OPTIONS>
```
