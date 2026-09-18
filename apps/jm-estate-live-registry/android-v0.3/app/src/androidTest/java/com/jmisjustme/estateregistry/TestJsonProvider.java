package com.jmisjustme.estateregistry;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;

import java.io.File;
import java.io.FileNotFoundException;

public final class TestJsonProvider extends ContentProvider {
    public static final String AUTHORITY = "com.jmisjustme.estateregistry.testjson";

    private File fileFor(Uri uri) {
        String name = uri.getLastPathSegment();
        if (name == null || name.isEmpty()) name = "body.json";
        name = name.replaceAll("[^A-Za-z0-9._-]", "_");
        File root = new File(getContext().getCacheDir(), "jm-test-provider");
        root.mkdirs();
        return new File(root, name);
    }

    @Override public boolean onCreate() { return true; }
    @Override public String getType(Uri uri) { return "application/json"; }

    @Override public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        File file = fileFor(uri);
        int flags;
        if (mode.contains("w")) {
            flags = ParcelFileDescriptor.MODE_CREATE | ParcelFileDescriptor.MODE_TRUNCATE | ParcelFileDescriptor.MODE_READ_WRITE;
        } else {
            flags = ParcelFileDescriptor.MODE_READ_ONLY;
        }
        return ParcelFileDescriptor.open(file, flags);
    }

    @Override public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        File file = fileFor(uri);
        MatrixCursor cursor = new MatrixCursor(new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE});
        cursor.addRow(new Object[]{file.getName(), file.exists() ? file.length() : 0L});
        return cursor;
    }

    @Override public Uri insert(Uri uri, ContentValues values) { throw new UnsupportedOperationException(); }
    @Override public int delete(Uri uri, String selection, String[] selectionArgs) { return 0; }
    @Override public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) { return 0; }
}
